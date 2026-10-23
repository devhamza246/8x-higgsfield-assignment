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
documentation update. At that check the remote `main` was still the initial commit, so the submission
notes then used the implementation branch URL. This historical state was superseded
by PR #1 merging into main, confirmed during the 24 October review follow-up.

The follow-up documentation commit was created locally, but `git push` failed with
“could not read Username for https://github.com” in the noninteractive shell.
Public API checks independently confirmed the implementation and earlier capture
logs are accessible on `codex/creative-studio`. Latest handoff notes need an
authenticated push; do not confuse that with a missing product deployment.

## Review follow-up — 24 October 2026 (Asia/Karachi)

- Reproduced an exhausted Vela project and verified that its message instructs a
  limit increase without suggesting Fast when Fast is already selected.
- Switched to Autumn launch and verified the old warning disappeared.
- Saved distinct Campaign A and Campaign B briefs, priorities and formats; switches
  restored the right values. A selected completed result survived page reload.
- With 5 credits of project allowance left, Quality correctly suggested Fast;
  switching to the affordable Fast option cleared the warning immediately.
- Added regression coverage for per-project state, legacy-owner migration, malformed
  context recovery, foreign result selection, useful budget guidance and obsolete
  async validation. All 13 application tests and the capture-export test pass.
- Independent read-only review identified the async stale-error race; a composer
  revision guard now suppresses errors after intervening context changes.
- Essential credit/settings explanations use at least 12px; the main demo disclosure
  uses 12px. Checked the 390px breakpoint without document overflow.
- Evidence: `project-context-review-desktop.jpg`, `project-context-review-mobile.jpg`.
- Verified all existing LOG_ENTRY bodies remain byte-identical prefixes. Only new
  exchanges/frontmatter updates from automatic capture are added.

Current repository status: PR #1 merged at `670fcbd`; pre-review local and remote
main matched `ec34389`. Earlier notes about missing implementation/pending handoff
push are historical, not a current blocker. This review is on
`codex/project-context-fixes`; its final publication and Git push are reported
separately rather than presumed successful.

Review update publication succeeded as Sites version 2, deployment
`appgdep_6adbdbeeaa4c819180828ead0a85cefe`, at the existing public URL.
Published Site-source commit: `cd2a183bc82fdd43e56fbf1954aae7d052f9f40e`.
