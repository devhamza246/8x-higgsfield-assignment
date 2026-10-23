import test from "node:test";
import assert from "node:assert/strict";
import {
  readProjectContext,
  saveProjectContext,
  activeProjectId,
  createValidationScope,
} from "../studio/context.mjs";
const memory = () => {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
  };
};
test("project briefs, settings and selected results stay isolated through a reload", () => {
  const storage = memory(),
    jobs = [
      { id: "result-a", projectId: "a", status: "completed" },
      { id: "result-b", projectId: "b", status: "completed" },
    ];
  const a = {
    prompt: "Campaign A",
    preset: "golden",
    settings: { priority: "fast", duration: 5, ratio: "9:16" },
    selectedId: "result-a",
  };
  const b = {
    prompt: "Campaign B",
    preset: "noir",
    settings: { priority: "quality", duration: 10, ratio: "1:1" },
    selectedId: "result-b",
  };
  saveProjectContext(storage, "a", a);
  saveProjectContext(storage, "b", b);
  assert.deepEqual(readProjectContext(storage, "a", jobs), a);
  assert.deepEqual(readProjectContext(storage, "b", jobs), b);
  assert.equal(activeProjectId(storage, [{ id: "a" }, { id: "b" }]), "b");
  const fresh = readProjectContext(storage, "c", jobs);
  assert.equal(fresh.prompt, "");
  assert.equal(fresh.selectedId, null);
  fresh.settings.duration = 10;
  assert.equal(readProjectContext(storage, "c", jobs).settings.duration, 8);
});
test("migrates only the legacy draft owner and rejects foreign selected results", () => {
  const storage = memory();
  storage.setItem(
    "higgsfield-studio-draft-v1",
    JSON.stringify({
      projectId: "a",
      prompt: "Old brief",
      preset: "golden",
      settings: { priority: "fast", duration: 5, ratio: "9:16" },
    }),
  );
  assert.equal(readProjectContext(storage, "a", []).prompt, "Old brief");
  assert.equal(readProjectContext(storage, "b", []).prompt, "");
  saveProjectContext(storage, "a", {
    prompt: "A",
    preset: "forest",
    settings: { priority: "balanced", duration: 8, ratio: "16:9" },
    selectedId: "foreign",
  });
  assert.equal(
    readProjectContext(storage, "a", [
      { id: "foreign", projectId: "b", status: "completed" },
    ]).selectedId,
    null,
  );
});
test("malformed saved context recovers to independent defaults without affecting job state", () => {
  const storage = memory();
  storage.setItem("higgsfield-studio-project-v2:a", "{broken");
  assert.equal(
    readProjectContext(storage, "a", []).settings.priority,
    "balanced",
  );
});

test("validation from a queued request becomes obsolete after editor changes or a project roundtrip", () => {
  const scope = createValidationScope();
  const balancedRequest = scope.capture();
  scope.invalidate(); // switching to affordable Fast
  assert.equal(scope.isCurrent(balancedRequest), false);
  const a = scope.capture();
  scope.invalidate();
  scope.invalidate(); // A → B → A
  assert.equal(scope.isCurrent(a), false);
  assert.equal(scope.isCurrent(scope.capture()), true);
});
