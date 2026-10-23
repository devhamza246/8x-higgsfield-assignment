# Higgsfield — Studio, reimagined

A product engineering assessment for 8x by Hamza Hameed.

[Open the public studio](https://vela-creative-studio-hamza.candyrat6.chatgpt.site) ·
[Public source on main](https://github.com/devhamza246/8x-higgsfield-assignment)

Public page, JavaScript and sample video verified without cookies or authentication.
See [submission links and checklist](docs/submission.md).

Keep campaign briefs, settings and film explorations together, with an independent
spending limit for each project and one shared demo-credit balance. Cost and
failure recovery stay visible inside the creative workflow.

## Run locally

No install, account, build tool or API key is required. Use Python 3:

```bash
python3 -m http.server 4173 --directory studio
```

Open http://localhost:4173. ES modules require an HTTP server, not a file:// URL.

## What works

- Three visual looks, Fast/Balanced/Quality configuration, 5/8/10-second duration,
  and wide, social or square formats.
- Preflight demo-credit cost, a hard project budget, shared demo balance, and an
  append-only reservation/return ledger.
- Queued cancellation, processing, success, and an opt-in failure scenario with
  automatic, exactly-once demo-credit recovery.
- Independent browser-local briefs, settings and selected results for each project.
  Generation history, refresh recovery, side-by-side
  version comparison, approval, issue reporting and matching MP4 downloads.
- Local JPG/PNG/WebP reference previews (up to 5 MB); reference files never leave
  the browser. Preview files are session-only; project/job records persist.
- Web Locks serialize writes across tabs where supported. Per-tab serialization
  is the fallback on older browsers, not a server-side concurrency guarantee.

## Honest limits

**There is no live AI inference.** The candidate has no provider API access.
The UI discloses demo mode. Twenty-seven bundled sample films match look, format
and duration; prompts and references do not change their content. Model names,
credit costs and wait estimates are illustrative. All credits are local demo
state, not billing. Reports are saved locally as pending review; no real support
request is sent. There is no authentication, cloud sync, subscription or backend.
Clearing browser storage removes local projects.

The sample image was created for this assessment using the built-in image tool.
See [media provenance](studio/assets/README.md) for the prompt and reproducible
FFmpeg sample-film generation. The application needs no image-generation tools
at runtime. Google Fonts is an optional network dependency with system fallbacks.

## Product decisions

The research suggested that product breadth can make cost and workflow decisions
harder to understand. This concept keeps the creative loop and cuts the marketplace
navigation, promotions, community feeds, subscription management and provider matrix.
The main improvements are **project-level spending protection**, **visible recovery**,
and **goal-oriented defaults** beside the creative preview.

Higgsfield already displays costs and provides credit history and technical-failure
refunds. This concept brings those concerns into one workspace; it does not claim
to invent them. The user-supplied research contains unresolved citation markers;
its review statistics are research leads, not validated claims in this submission.

## Architecture and checks

- `studio/state.mjs`: pure, immutable economy and job transitions.
- `studio/repository.mjs`: serialized storage transactions with shared-lock support.
- `studio/context.mjs`: per-project drafts and result selection, including legacy-draft migration.
- `studio/app.mjs`: browser interaction, persistence and rendering.
- `studio/styles.css`: responsive design, keyboard focus and reduced-motion support.
- `scripts/build_studio.py`: curated static build, excluding logs/research/credentials.

Node 22+ and Python 3:

```bash
node --test --test-isolation=none tests/studio-state.test.mjs tests/studio-repository.test.mjs tests/studio-context.test.mjs
python3 -m unittest discover -s tests -v
python3 scripts/build_studio.py
```

The build creates ignored `studio/dist/`, suitable for any static host. The Sites
identity is in `studio/.openai/hosting.json`. Source code and assessment evidence
remain in this GitHub repository; deployed assets contain only the application.

## Assessment evidence

- [Capture verification](CAPTURE-TEST.md)
- [Initial product reconnaissance](recon/README.md)
- [Accepted design](docs/superpowers/specs/2026-10-24-studio-design.md)
- [Implementation plan](docs/superpowers/plans/2026-10-24-studio.md)
- [Walkthrough outline](docs/assessment-walkthrough.md)

`.agent-logs/` contains automatic, unedited user prompts and final assistant
responses. It is committed alongside work. Tool calls and intermediate reasoning
are excluded. The current final response is included in the next commit after
it arrives in the log. No association with or endorsement by Higgsfield is implied.

## Repository status — 24 October 2026

PR #1 was merged into `main` at `670fcbd`; the pre-review local and remote main
were both `ec34389`. The implementation, earlier submission notes and capture logs
are therefore present on main. The previous pending-push note described an earlier
shell authentication failure and is no longer the repository's current state.
This review follow-up is being developed on `codex/project-context-fixes`.
