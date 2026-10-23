import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/agent_capture.py'


class CaptureTest(unittest.TestCase):
    def test_capture_is_exact_scoped_final_only_and_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            repo = root / 'repo'
            repo.mkdir()
            sessions = root / 'sessions'
            sessions.mkdir()
            source = sessions / 'rollout-test.jsonl'
            rows = []

            def add(kind, payload):
                rows.append(json.dumps(dict(timestamp='2026-10-23T13:00:00.123Z', type=kind, payload=payload)) + '\n')

            add('session_meta', dict(id='session-test', cwd=str(repo)))
            add('turn_context', dict(model='model-one'))
            add('response_item', dict(type='message', role='user', content=[dict(type='input_text', text='  exact prompt\n\n')]))
            add('response_item', dict(type='message', role='assistant', phase='commentary', content=[dict(type='output_text', text='PRIVATE INTERMEDIATE')]))
            add('response_item', dict(type='reasoning', summary=[dict(text='PRIVATE THOUGHT')]))
            add('response_item', dict(type='message', role='assistant', phase='final_answer', content=[dict(type='output_text', text='  exact final\n')]))
            source.write_text(''.join(rows))

            def run():
                subprocess.run([sys.executable, str(SCRIPT), '--repo', str(repo), '--sessions', str(sessions), '--once'], check=True)

            run()
            log = next((repo / '.agent-logs').glob('*.md'))
            original = log.read_text()
            self.assertIn('  exact prompt\n\n', original)
            self.assertIn('  exact final\n', original)
            self.assertNotIn('PRIVATE', original)
            run()
            self.assertEqual(original, log.read_text())
            add('turn_context', dict(model='model-two'))
            add('response_item', dict(type='message', role='user', content=[dict(type='input_text', text='next')]))
            add('response_item', dict(type='message', role='assistant', phase='final_answer', content=[dict(type='output_text', text='second')]))
            source.write_text(''.join(rows) + '{"partial":')
            run()
            updated = log.read_text()
            self.assertIn('model: model-two\n\nnext', updated)
            self.assertEqual(updated.count('[LOG_ENTRY type=PROMPT'), 2)
            self.assertEqual(updated.count('[LOG_ENTRY type=RESPONSE'), 2)
            self.assertIn(original.split('---\n', 2)[2], updated)
            other = sessions / 'rollout-other.jsonl'
            other.write_text(source.read_text().replace(str(repo), str(root / 'unrelated')) + '\x00\n')
            run()
            self.assertEqual(len(list((repo / '.agent-logs').glob('*.md'))), 1)
            internal = sessions / 'rollout-guardian.jsonl'
            internal_rows = [json.loads(line) for line in rows]
            internal_rows[0]['payload'].update(id='internal', thread_source='guardian_review', source={'subagent': {'other': 'guardian'}})
            internal.write_text(''.join(json.dumps(row) + '\n' for row in internal_rows))
            run()
            self.assertEqual(len(list((repo / '.agent-logs').glob('*.md'))), 1)


if __name__ == '__main__':
    unittest.main()
