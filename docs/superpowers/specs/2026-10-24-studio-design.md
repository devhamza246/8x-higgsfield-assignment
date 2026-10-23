# Vela Studio — assessment design

Approved direction: the candidate's “Let's start working on it then” accepts the
focused video-first workspace proposed in the preceding analysis. Implementation
choices below are the builder's calls. No AI-provider access is available.

## Intent
Help a creator explore a product-ad concept while understanding cost, budget,
progress and recovery. Demonstrate product judgment and working application state,
not a replica of Higgsfield's full model marketplace.

## Experience
A dark editorial workspace with a narrow project sidebar, large cinematic output,
prompt composer and compact setup panel. Warm ivory text, muted olive surfaces and
acid-lime primary actions. Vela is a fictional botanical fragrance sample project.
Navigation: Workspace, Projects and Activity. A visible Demo mode disclosure
explains that media and generation timings are samples. No sign-in required.

Choose a visual direction, enter a brief and optional local image reference,
choose Fast/Balanced/Quality, duration and aspect ratio. Before running, show demo
credit cost, remaining project allowance and illustrative completion time. A queued
sample request can be cancelled. Processing ends in a playable sample video or an
explicitly selected demo failure. Completed versions can be compared, accepted,
reported or downloaded. Reports are pending review, not automatic free retries.

## Working behavior
Pure state engine handles immutable jobs, an append-only demo-credit ledger and
budget checks. Initial balance 120 demo credits, project limit 80. At most one
active request per project. Reserve credits at request; settle on success; return
on technical failure or queued cancellation exactly once. Used project allowance
includes reserved and successful requests. Budget cannot be set below committed
usage. Invalid inputs and insufficient budget are rejected before mutation.
Persist projects, settings, jobs and ledger locally. Refresh resumes active jobs.
Multi-tab writes use Web Locks where available and reconcile from current storage.
References stay local and are not claimed as inputs to sample video synthesis.
Images have MIME/size validation and previews; generated sample assets are bundled.

## Boundaries
All costs, recommendations and timing are illustrative, not real provider claims.
No subscriptions, payments, account migration, character/voice training, model API,
community feed or timeline editor. Honest recovery, persistence and downloads are
more valuable than extra navigation. Browser-local storage, not cloud sync.

## Architecture and delivery
Dependency-free ES modules and CSS; Node built-in tests for the state engine;
Python static preview/build. This minimizes environment setup and makes the public
repository portable. Deploy static assets through Sites if available; its default
private URL is a preview and does not satisfy the public assessment requirement.
Verify audience before claiming submission readiness. Capture logs accompany code.
