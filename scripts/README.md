# Automatic assignment capture

`agent_capture.py` watches Codex's persisted `~/.codex/sessions/**/rollout-*.jsonl`
files once per second. Only sessions whose working directory resolves to this
repository are exported. Internal approval-review and subagent sessions are
excluded. User messages and assistant messages with `phase: final_answer` are
exported; commentary, reasoning, system/developer messages and tools are excluded.
Desktop-injected environment/page metadata is excluded. Pasted text attachments
are included verbatim after the original prompt, with an attachment label.

Each session has a Markdown log in `.agent-logs/`. Entry text is never rewritten:
the exporter refuses changes to an existing entry prefix. Only frontmatter counts
and last-prompt timestamps update. Writes are atomic, and a directory lock prevents
two exporters from writing concurrently. On restart, the service catches up from
persisted transcripts. Failures appear in the service journal.

The installed configuration is
`~/.config/systemd/user/8x-agent-capture.service`; its tracked source is
`scripts/agent-capture.service`. It starts at user login, independently of Codex,
and restarts on process failure. No Codex hooks or trust settings were modified.
The unit contains this machine's absolute repository path; update it when moving
the checkout. This relies on the observed Codex 0.162.0-alpha.17.2 JSONL format;
repeat the real canary check after upgrading Codex or moving the repository.

```bash
systemctl --user status 8x-agent-capture.service
journalctl --user -u 8x-agent-capture.service -n 20 --no-pager
python3 -m unittest discover -s tests -v
```

To install on this machine:

```bash
install -m 644 scripts/agent-capture.service ~/.config/systemd/user/8x-agent-capture.service
systemctl --user daemon-reload
systemctl --user enable --now 8x-agent-capture.service
```

Commit `.agent-logs/` alongside each subsequent code change. The current response
arrives in its log after the turn finishes, so include it in the next commit.
Do not edit or remove recorded human exchanges. No assignment product work may
begin until the two-session check in `CAPTURE-TEST.md` is green.
