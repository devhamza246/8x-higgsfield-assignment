import test from "node:test";
import assert from "node:assert/strict";
import { createRepository } from "../studio/repository.mjs";
import { createState, startJob, available } from "../studio/state.mjs";

test("a second tab initializes from current storage rather than a stale startup snapshot", async () => {
  let disk = createState(),
    tail = Promise.resolve();
  const locked = (fn) => {
    const task = tail.then(fn);
    tail = task.catch(() => {});
    return task;
  };
  const options = {
    read: () => structuredClone(disk),
    write: (s) => {
      disk = structuredClone(s);
    },
    withLock: locked,
  };
  const tabA = createRepository(options),
    tabB = createRepository(options);
  const request = {
    projectId: "vela",
    prompt: "Product reveal",
    preset: "forest",
    settings: { priority: "balanced", duration: 5, ratio: "16:9" },
    outcome: "success",
  };
  await Promise.all([tabA((s) => startJob(s, request, 1000)), tabB((s) => s)]);
  assert.equal(disk.jobs.length, 1);
  assert.equal(available(disk), 112);
  const results = await Promise.allSettled([
    tabA((s) => startJob(s, request, 1001)),
    tabB((s) => startJob(s, request, 1002)),
  ]);
  assert.equal(results.filter((r) => r.status === "rejected").length, 2);
  assert.equal(disk.ledger.length, 1);
});
test("failed transactions do not prevent later changes", async () => {
  let disk = { value: 1 };
  const change = createRepository({
    read: () => ({ ...disk }),
    write: (s) => {
      disk = s;
    },
    withLock: (fn) => fn(),
  });
  await assert.rejects(
    change(() => {
      throw new Error("invalid");
    }),
    /invalid/,
  );
  await change((s) => ({ ...s, value: s.value + 1 }));
  assert.equal(disk.value, 2);
});
