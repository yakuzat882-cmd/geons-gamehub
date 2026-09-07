const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "src", "state", "storage.js"), "utf8");

function createStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
    removeItem(key) { values.delete(String(key)); }
  };
}

function loadModule() {
  const localStorage = createStorage();
  const context = { window: {}, localStorage, console };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { storage: context.window.GeonStorage, localStorage };
}

test("storage JSON facade rejects arrays as object records", () => {
  const { storage, localStorage } = loadModule();
  localStorage.setItem("proudGeonQuizSettings", JSON.stringify(["bad"]));
  assert.deepEqual(storage.get("proudGeonQuizSettings", { theme: "original" }), { theme: "original" });
});

test("storage import rejects unsupported keys and schema versions", () => {
  const { storage } = loadModule();
  assert.equal(storage.validateImport({ schemaVersion: 3, keys: {} }), false);
  assert.equal(storage.validateImport({ schemaVersion: 2, keys: { unrelated: {} } }), false);
  assert.equal(storage.validateImport({ schemaVersion: 2, keys: { proudGeonQuizSaveV2: {} } }), true);
});

test("storage import backs up and removes stale related keys before replacement", () => {
  const { storage, localStorage } = loadModule();
  localStorage.setItem("proudGeonQuizOldState", JSON.stringify({ value: 1 }));
  localStorage.setItem("proudGeonQuizSettings", JSON.stringify({ theme: "dark" }));
  localStorage.setItem("unrelatedAppKey", JSON.stringify({ keep: true }));
  const result = storage.importAll({ schemaVersion: 2, keys: { proudGeonQuizSaveV2: { schemaVersion: 2 } } });
  assert.equal(result.ok, true);
  assert.equal(localStorage.getItem("proudGeonQuizOldState"), null);
  const backupKey = [...Array(localStorage.length).keys()]
    .map(index => localStorage.key(index))
    .find(key => key && key.startsWith("proudGeonQuizBackup:pre-import:"));
  assert.ok(backupKey, "pre-import backup should exist");
  assert.deepEqual(JSON.parse(localStorage.getItem("proudGeonQuizSaveV2")), { schemaVersion: 2 });
  assert.deepEqual(JSON.parse(localStorage.getItem("unrelatedAppKey")), { keep: true });
});
