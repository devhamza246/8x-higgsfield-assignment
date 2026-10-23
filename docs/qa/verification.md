# Verification — 24 October 2026 (Asia/Karachi)

## Automated

- Node syntax check: `node --check studio/app.mjs` — passed.
- Application suite: 8 passing tests across state and repository tests.
- Capture exporter suite: 1 passing Python integration test.
- Static build: 27 MP4 variants and application files packaged successfully.
- Source whitespace check: passed (raw capture logs intentionally excluded).

## Browser observations

Tested using Codex's in-app Chromium browser against the local HTTP server:

- Creating a sample reserves 13 demo credits at the default 8-second Balanced setting.
- Creating a new project and a 5-second vertical Golden-hour sample reserves 8.
- Refreshing an active request retains the request and reserved balance.
- Cancelling while queued returns the reservation and records it in Activity.
- Opt-in simulated failure returns credits; the ledger shows both reservation and return.
- Setting a project limit to existing committed usage blocks a new sample without charging.
- Download sources point to matching local media. The default MP4 was observed playing:
  `readyState=4`, `paused=false`, `duration=8`.
- A local PNG reference shows a filename, preview and explicit unchanged-sample disclosure.
- 390-pixel mobile viewport has no document-level horizontal overflow. Exploration
  thumbnails intentionally scroll horizontally. Viewport override reset afterward.
- Projects and Activity navigation, saved version selection and priority/format controls
  were exercised. Desktop evidence: `studio-desktop.jpg`.

## Independent code review and fixes

The review found a startup write outside the shared transaction lock, playback
continuing across project switches, and a reference label unreachable by keyboard.
All three were fixed: startup now uses the tested repository transaction path,
project switches stop video, and the reference picker is a native button.
The repository tests cover stale startup/concurrent updates and recovery after
rejected updates. A subsequent browser observation found active reservations being
counted twice in the displayed forecast; a regression test now covers the corrected
forecast before, during and after generation.

## Limits

This is a local-state demonstration, not server billing or live AI generation.
Real provider reliability and exact model timings cannot be tested without API
access. Browser automation initially lost its terminal-backed preview server; a
temporary user service stabilized it. The local file chooser stalled during one
run but completed; no external upload occurred. A private deployed preview must
not be described as an anonymous/public assessment link.

## Hosted result

Sites deployment `appgdep_6adbb6e3bd448191abe98a1ff090e753` returned `succeeded`.
Owner-private URL: https://vela-creative-studio-hamza.candyrat6.chatgpt.site
Source commit at the Sites repository: `def1a1601975f9b5f84d3266d60d46dc1d5a0bb5`.
The deployment contains only curated studio files; research and capture logs stay
in the assessment repository. Anonymous/public access is not yet enabled.

## Public access verification — 24 October, 00:47 PKT

The owner approved continuing from the private-preview handoff. The Sites audience
was updated to `public` (access-policy revision 2). Independent HTTP requests with
no cookies or Authorization header returned HTTP 200 for the page, `/app.mjs`,
`/repository.mjs`, and `/assets/forest-wide-8.mp4`. The page contained the expected
studio heading and did not redirect to a sign-in page. This verifies anonymous
HTTP access; it is distinct from the earlier owner-authenticated browser QA.

The GitHub public API reports `private: false` and `visibility: public`. Remote
`codex/creative-studio` was already synchronized at `fc73ddb` before the current
documentation update. The remote `main` remains the initial commit, so the submission
notes use the implementation branch URL explicitly. No shared-branch merge was made.
