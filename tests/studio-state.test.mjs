import test from "node:test";
import assert from "node:assert/strict";
import {
  createState,
  forecastBudget,
  quote,
  startJob,
  advanceJobs,
  cancelJob,
  setBudget,
  available,
  used,
} from "../studio/state.mjs";
const input = {
  projectId: "vela",
  prompt: "A slow cinematic reveal",
  preset: "forest",
  settings: { priority: "balanced", duration: 5, ratio: "16:9" },
  outcome: "success",
};
test("reserves credits once and blocks duplicate active requests", () => {
  const state = createState();
  const next = startJob(state, input, 1000);
  assert.equal(available(next), 112);
  assert.equal(used(next, "vela"), 8);
  assert.equal(state.jobs.length, 0);
  assert.throws(() => startJob(next, input, 1001), /already/);
});
test("blocks over-budget and invalid requests without charging", () => {
  const state = setBudget(createState(), "vela", 5);
  assert.throws(() => startJob(state, input, 1), /budget/);
  assert.equal(available(state), 120);
  assert.throws(
    () => startJob(createState(), { ...input, prompt: "  " }, 1),
    /brief/,
  );
  assert.throws(() => quote({ ...input.settings, duration: NaN }), /duration/);
  assert.throws(() => setBudget(createState(), "vela", -1), /budget/i);
});
test("failure and queued cancellation return credits exactly once", () => {
  const queued = startJob(createState(), input, 1000);
  const cancelled = cancelJob(queued, queued.jobs[0].id, 1100);
  assert.equal(available(cancelled), 120);
  assert.equal(used(cancelled, "vela"), 0);
  assert.deepEqual(cancelJob(cancelled, queued.jobs[0].id, 1200), cancelled);
  const failed = startJob(
    createState(),
    { ...input, outcome: "failure" },
    1000,
  );
  const settled = advanceJobs(failed, 99999);
  assert.equal(available(settled), 120);
  assert.equal(settled.jobs[0].status, "failed");
  assert.equal(advanceJobs(settled, 999999).ledger.length, 2);
});
test("refresh resumes processing and success settles once; processing cannot cancel", () => {
  const initial = startJob(createState(), input, 1000);
  const restored = JSON.parse(JSON.stringify(initial));
  const processing = advanceJobs(restored, 6000);
  assert.equal(processing.jobs[0].status, "processing");
  assert.throws(
    () => cancelJob(processing, processing.jobs[0].id, 6000),
    /started/,
  );
  const done = advanceJobs(processing, 25000);
  assert.equal(done.jobs[0].status, "completed");
  assert.equal(available(done), 112);
  assert.equal(advanceJobs(done, 30000).ledger.length, 1);
  assert.throws(() => setBudget(done, "vela", 7), /committed/);
});
test("limits and pricing are predictable across configurations", () => {
  assert.equal(quote({ ...input.settings, priority: "fast" }).cost, 5);
  assert.equal(
    quote({ ...input.settings, priority: "quality", duration: 10 }).cost,
    28,
  );
  assert.throws(() => quote({ ...input.settings, ratio: "bogus" }), /ratio/);
  let state = createState();
  state.projects[0].budget = 1000;
  for (let i = 0; i < 15; i++) {
    state = startJob(state, input, i * 20000);
    state = advanceJobs(state, i * 20000 + 19000);
  }
  assert.equal(available(state), 0);
  assert.throws(() => startJob(state, input, 999999), /balance/);
});

test("budget forecast does not count an active reservation twice", () => {
 const initial=createState();
 assert.equal(forecastBudget(initial,'vela',input.settings).remaining,72);
 const active=startJob(initial,input,1000);
 assert.equal(forecastBudget(active,'vela',input.settings).remaining,72);
 assert.equal(forecastBudget(active,'vela',input.settings).additionalCost,0);
 const done=advanceJobs(active,20000);
 assert.equal(forecastBudget(done,'vela',input.settings).remaining,64);
});
