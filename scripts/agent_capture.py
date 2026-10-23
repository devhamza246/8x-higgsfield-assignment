#!/usr/bin/env python3
"""Automatically export only repository prompts and final answers from Codex JSONL."""
import argparse
import fcntl
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path


def read_records(path):
    records = []
    with path.open() as stream:
        for line in stream:
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                # The active writer may not have finished its final line yet.
                if not line.endswith('\n'):
                    break
                raise
    return records


def message_text(payload):
    return ''.join(part['text'] for part in payload.get('content', [])
                   if part.get('type') in ('input_text', 'output_text'))


def entries_for(records):
    models = [r['payload']['model'] for r in records
              if r['type'] == 'turn_context' and r['payload'].get('model')]
    model = models[0] if models else 'unknown'
    entries = []
    number = 0
    for record in records:
        payload = record.get('payload', {})
        if record['type'] == 'turn_context':
            model = payload.get('model', model)
            # The desktop writes the context after the initial user input.
            if entries and entries[-1]['kind'] == 'PROMPT':
                entries[-1]['model'] = model
        if record['type'] != 'response_item' or payload.get('type') != 'message':
            continue
        role = payload.get('role')
        body = message_text(payload)
        if role == 'user':
            # Desktop-generated context is not a human prompt.
            if body.startswith(('<environment_context>', '<external_codex_apps_open_page>')):
                continue
            number += 1
            # Preserve pasted-file content in full alongside the verbatim message.
            for name in re.findall(r'(/[^\n]+/\.codex/attachments/[^\n]+\.txt)', body):
                attachment = Path(name)
                if attachment.is_file():
                    body += '\n\n[ATTACHED FILE: ' + name + ']\n' + attachment.read_text()
            kind = 'PROMPT'
        elif role == 'assistant' and payload.get('phase') == 'final_answer' and number:
            kind = 'RESPONSE'
        else:
            continue
        entries.append(dict(kind=kind, num=number, timestamp=record['timestamp'], model=model, body=body))
    return entries


def export_session(source, repo, author):
    # Read scope first: unrelated histories may be large or use older formats.
    with source.open() as stream:
        first_record = json.loads(stream.readline())
    meta = first_record.get('payload', {}) if first_record.get('type') == 'session_meta' else {}
    if meta.get('thread_source') == 'guardian_review' or isinstance(meta.get('source'), dict):
        return
    if not meta.get('cwd') or Path(meta['cwd']).resolve() != repo:
        return
    records = read_records(source)
    entries = entries_for(records)
    if not entries:
        return
    session = meta['id']
    if not re.fullmatch(r'[A-Za-z0-9_-]+', session):
        raise ValueError('Unsafe session id')
    first = entries[0]['timestamp']
    stamp = datetime.fromisoformat(first.replace('Z', '+00:00')).strftime('%Y-%m-%d_%H-%M-%S')
    target = repo / '.agent-logs' / f'{stamp}_{session}.md'
    prompts = [e for e in entries if e['kind'] == 'PROMPT']
    header = '\n'.join([
        '---', f'session_id: {session}', f'date: {first[:10]}',
        f'author: {author}', f'model: {entries[0]["model"]}', 'tool: codex',
        f'project: {repo.name}', f'total_exchanges: {len(prompts)}',
        f'first_prompt_time: {first}', f'last_prompt_time: {prompts[-1]["timestamp"]}',
        '---', '', f'# Session Log - {first[:10]}', '',
        f'Session: `{session[:8]}` | Project: `{repo.name}` | Author: `{author}`', '', '---', '',
    ])
    blocks = [f'[LOG_ENTRY type={e["kind"]} num={e["num"]} session={session[:8]}]\n'
              f'timestamp: {e["timestamp"]}\nmodel: {e["model"]}\n\n{e["body"]}\n\n\n' for e in entries]
    body = ''.join(blocks)
    new = header + '\n' + body
    if target.exists():
        old = target.read_text()
        if old == new:
            return
        # Metadata may update; recorded entry bytes must never change or disappear.
        old_body = old[old.index('[LOG_ENTRY '):]
        if not body.startswith(old_body):
            raise RuntimeError(f'Refusing to rewrite existing entries: {target}')
    temporary = target.with_suffix('.tmp')
    with temporary.open('w') as stream:
        stream.write(new)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(target)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--sessions', type=Path, default=Path.home() / '.codex/sessions')
    parser.add_argument('--author', default='devhamza246')
    parser.add_argument('--once', action='store_true')
    args = parser.parse_args()
    repo = args.repo.resolve()
    logs = repo / '.agent-logs'
    logs.mkdir(exist_ok=True)
    # Lock the directory, without adding runtime files to the submission.
    lock = os.open(logs, os.O_RDONLY)
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    seen = {}
    while True:
        for source in args.sessions.rglob('rollout-*.jsonl'):
            try:
                stat = source.stat()
                signature = (stat.st_size, stat.st_mtime_ns)
                if seen.get(source) != signature:
                    export_session(source, repo, args.author)
                    seen[source] = signature
            except Exception as error:
                print(f'{source}: {error}', file=sys.stderr, flush=True)
                if args.once:
                    raise
        if args.once:
            return
        time.sleep(1)


if __name__ == '__main__':
    main()
