import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import { Module } from "node:module";
import ts from "typescript";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let activeRuntime;
const reactMock = {
  useCallback(callback) {
    return activeRuntime.useCallback(callback);
  },
  useEffect(effect) {
    return activeRuntime.useEffect(effect);
  },
  useRef(initialValue) {
    return activeRuntime.useRef(initialValue);
  },
  useState(initialValue) {
    return activeRuntime.useState(initialValue);
  },
};

const originalLoad = Module._load;
const originalTsExtension = require.extensions[".ts"];
require.extensions[".ts"] = (loadedModule, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  loadedModule._compile(compiled, filename);
};
Module._load = function loadWithReactMock(request, parent, isMain) {
  if (request === "react") {
    return reactMock;
  }

  return originalLoad.call(this, request, parent, isMain);
};

const { useEvents } = require(
  resolve(testDirectory, "../src/features/events/hooks/use-events.ts"),
);
Module._load = originalLoad;
if (originalTsExtension) {
  require.extensions[".ts"] = originalTsExtension;
} else {
  delete require.extensions[".ts"];
}

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalDocument = globalThis.document;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalDocument === undefined) {
    delete globalThis.document;
  } else {
    globalThis.document = originalDocument;
  }
});

function createRuntime() {
  const states = [];
  const refs = [];
  const effects = [];
  let cursor = 0;

  return {
    effects,
    states,
    beginRender() {
      cursor = 0;
      effects.length = 0;
    },
    useCallback(callback) {
      cursor += 1;
      return callback;
    },
    useEffect(effect) {
      cursor += 1;
      effects.push(effect);
    },
    useRef(initialValue) {
      const index = cursor;
      cursor += 1;
      refs[index] ??= { current: initialValue };
      return refs[index];
    },
    useState(initialValue) {
      const index = cursor;
      cursor += 1;
      states[index] ??= typeof initialValue === "function"
        ? initialValue()
        : initialValue;
      return [
        states[index],
        (nextValue) => {
          states[index] = typeof nextValue === "function"
            ? nextValue(states[index])
            : nextValue;
        },
      ];
    },
  };
}

function createHarness(options) {
  const runtime = createRuntime();
  activeRuntime = runtime;
  runtime.beginRender();
  // The fake dispatcher provides the hook slots used by this isolated test.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const result = useEvents(options);
  const cleanups = [];

  return {
    result,
    runtime,
    async mount() {
      for (const effect of runtime.effects) {
        const cleanup = effect();
        if (typeof cleanup === "function") {
          cleanups.push(cleanup);
        }
      }
      await flushMicrotasks();
    },
    unmount() {
      for (const cleanup of cleanups.reverse()) {
        cleanup();
      }
    },
  };
}

function createPayload(period, id) {
  return {
    source: "USGS",
    period,
    generatedAt: "2026-10-20T00:00:00.000Z",
    receivedAt: "2026-10-20T00:00:01.000Z",
    events: [{ id }],
  };
}

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

function installBrowserMocks(initialVisibility = "visible") {
  const listeners = new Map();
  let intervalCallback;
  let intervalDelay;
  let clearedInterval;

  globalThis.window = {
    setInterval(callback, delay) {
      intervalCallback = callback;
      intervalDelay = delay;
      return 42;
    },
    clearInterval(id) {
      clearedInterval = id;
    },
  };
  globalThis.document = {
    visibilityState: initialVisibility,
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) {
        listeners.delete(type);
      }
    },
  };

  return {
    listeners,
    get intervalCallback() {
      return intervalCallback;
    },
    get intervalDelay() {
      return intervalDelay;
    },
    get clearedInterval() {
      return clearedInterval;
    },
  };
}

test("polls every 60 seconds only while visible and refreshes on return", async () => {
  const requests = [];
  globalThis.fetch = async (input) => {
    const period = new URL(String(input), "http://localhost").searchParams.get("period");
    requests.push(period);
    return jsonResponse(createPayload(period, "event-" + requests.length));
  };
  const browser = installBrowserMocks();
  const harness = createHarness({ initialPeriod: "day", pollWhileVisible: true });

  await harness.mount();

  assert.equal(browser.intervalDelay, 60_000);
  assert.deepEqual(requests, ["day"]);

  globalThis.document.visibilityState = "hidden";
  browser.intervalCallback();
  await flushMicrotasks();
  assert.deepEqual(requests, ["day"]);

  globalThis.document.visibilityState = "visible";
  browser.listeners.get("visibilitychange")();
  await flushMicrotasks();
  assert.deepEqual(requests, ["day", "day"]);

  harness.unmount();
  assert.equal(browser.clearedInterval, 42);
  assert.equal(browser.listeners.has("visibilitychange"), false);
});

test("keeps the last payload and restores its period after a failed refresh", async () => {
  const previousPayload = createPayload("day", "last-good-event");
  let rejectRefresh;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return jsonResponse(previousPayload);
    }
    return new Promise((_, reject) => {
      rejectRefresh = reject;
    });
  };
  installBrowserMocks();
  const harness = createHarness({ initialPeriod: "day", pollWhileVisible: false });

  await harness.mount();
  assert.equal(harness.runtime.states[0], "day");
  assert.equal(harness.runtime.states[1], previousPayload);

  harness.result.choosePeriod("week");
  assert.equal(harness.runtime.states[0], "week");
  assert.equal(harness.runtime.states[1], previousPayload);
  assert.equal(harness.runtime.states[2], true);

  rejectRefresh(new Error("USGS unavailable"));
  await flushMicrotasks();

  assert.equal(harness.runtime.states[0], "day");
  assert.equal(harness.runtime.states[1], previousPayload);
  assert.equal(harness.runtime.states[2], false);
  assert.equal(harness.runtime.states[3], "USGS unavailable");
  harness.unmount();
});

test("ignores an older response that finishes after a newer period", async () => {
  const pendingRequests = [];
  globalThis.fetch = (input) => new Promise((resolve, reject) => {
    const period = new URL(String(input), "http://localhost").searchParams.get("period");
    pendingRequests.push({ period, resolve, reject });
  });
  installBrowserMocks();
  const harness = createHarness({ initialPeriod: "day", pollWhileVisible: false });

  await harness.mount();
  harness.result.choosePeriod("week");
  assert.deepEqual(pendingRequests.map((request) => request.period), ["day", "week"]);

  pendingRequests[1].resolve(jsonResponse(createPayload("week", "new-event")));
  await flushMicrotasks();
  pendingRequests[0].resolve(jsonResponse(createPayload("day", "stale-event")));
  await flushMicrotasks();

  assert.equal(harness.runtime.states[0], "week");
  assert.equal(harness.runtime.states[1].events[0].id, "new-event");
  assert.equal(harness.runtime.states[2], false);
  assert.equal(harness.runtime.states[3], null);
  harness.unmount();
});

test("loads the seven-day history and refreshes only on demand", async () => {
  const requests = [];
  globalThis.fetch = async (input) => {
    const period = new URL(String(input), "http://localhost").searchParams.get("period");
    requests.push(period);
    return jsonResponse(createPayload(period, `event-${requests.length}`));
  };
  const browser = installBrowserMocks();
  const harness = createHarness({ initialPeriod: "week", pollWhileVisible: false });

  await harness.mount();

  assert.deepEqual(requests, ["week"]);
  assert.equal(browser.intervalDelay, undefined);
  assert.equal(browser.listeners.size, 0);
  assert.equal(harness.runtime.states[0], "week");
  assert.equal(harness.runtime.states[1].period, "week");

  harness.result.refresh();
  await flushMicrotasks();

  assert.deepEqual(requests, ["week", "week"]);
  assert.equal(browser.intervalDelay, undefined);
  assert.equal(browser.listeners.size, 0);
  assert.equal(harness.runtime.states[1].events[0].id, "event-2");
  harness.unmount();
});
