import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch
import gemini_code_agent as agent

class PathPolicyTests(unittest.TestCase):
    def test_allows_source_and_regression_test_paths(self):
        self.assertEqual(agent.validate_path('server/http/example.test.ts'), 'server/http/example.test.ts')
        self.assertEqual(agent.validate_path('db/migrations/0099_new_guard.sql'), 'db/migrations/0099_new_guard.sql')
        self.assertEqual(agent.validate_path('docs/security-note.md'), 'docs/security-note.md')

    def test_rejects_traversal_absolute_and_backslash(self):
        for value in ('../outside.txt', '/tmp/outside.txt', 'server/../../outside.ts', 'server\\evil.ts'):
            with self.subTest(value=value), self.assertRaises(agent.AgentError):
                agent.validate_path(value)

    def test_rejects_workflows_credentials_and_package_manifests(self):
        for value in ('.github/workflows/evil.yml', '.env', '.env.production', 'config/service.key',
                      'certs/signing.pem', 'server/secret_store.ts', 'server/user_credentials.ts',
                      'scripts/ci/release.py', 'scripts/deploy/prod.sh', 'package.json', 'package-lock.json',
                      'scripts/gemini_code_agent.py', 'scripts/gemini_pr_review.py', 'node_modules/x.js'):
            with self.subTest(value=value), self.assertRaises(agent.AgentError):
                agent.validate_path(value)

    def test_rejects_nested_manifests_and_control_directories(self):
        for path in (
            'server/package.json', 'src/pnpm-lock.yaml', 'server/.npmrc',
            'server/bun.lock', 'server/.github/workflows/unsafe.yml',
            'src/.git/config', 'tests/node_modules/pkg/index.js',
        ):
            with self.subTest(path=path), self.assertRaises(agent.AgentError):
                agent.validate_path(path)

    def test_rejects_paths_outside_source_policy(self):
        with self.assertRaises(agent.AgentError):
            agent.validate_path('vercel.json')

class ArtifactTests(unittest.TestCase):
    def test_rejects_entire_artifact_before_writing_any_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            artifact = root / 'candidate.json'
            artifact.write_text(json.dumps({'files': [
                {'path': 'server/new.ts', 'content': 'safe'},
                {'path': '.github/workflows/pwn.yml', 'content': 'bad'}]}))
            with patch.object(pathlib.Path, 'cwd', return_value=root):
                with self.assertRaises(agent.AgentError):
                    agent.apply_artifact(artifact)
            self.assertFalse((root / 'server/new.ts').exists())

    def test_rejects_oversized_aggregate_before_writing_any_file(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            artifact = root / 'candidate.json'
            artifact.write_text(json.dumps({'files': [
                {'path': 'server/first.ts', 'content': 'a' * 400_000},
                {'path': 'server/second.ts', 'content': 'b' * 400_000},
                {'path': 'server/third.ts', 'content': 'c' * 400_000}]}))
            import os
            old = os.getcwd()
            try:
                os.chdir(root)
                with self.assertRaisesRegex(agent.AgentError, 'total output size limit'):
                    agent.apply_artifact(artifact)
            finally:
                os.chdir(old)
            self.assertFalse((root / 'server/first.ts').exists())
            self.assertFalse((root / 'server/second.ts').exists())
            self.assertFalse((root / 'server/third.ts').exists())

    def test_rejects_symlink_escape(self):
        with tempfile.TemporaryDirectory() as temp, tempfile.TemporaryDirectory() as outside:
            root = pathlib.Path(temp)
            (root / 'server').symlink_to(outside, target_is_directory=True)
            artifact = root / 'candidate.json'
            artifact.write_text(json.dumps({'files': [{'path': 'server/escaped.ts', 'content': 'bad'}]}))
            import os
            old = os.getcwd()
            try:
                os.chdir(root)
                with self.assertRaises(agent.AgentError):
                    agent.apply_artifact(artifact)
            finally:
                os.chdir(old)
            self.assertFalse((pathlib.Path(outside) / 'escaped.ts').exists())

    def test_applies_validated_file_content(self):
        with tempfile.TemporaryDirectory() as temp:
            root = pathlib.Path(temp)
            artifact = root / 'candidate.json'
            artifact.write_text(json.dumps({'files': [{'path': 'server/new.ts', 'content': 'export const ok = true;\n'}]}))
            import os
            old = os.getcwd()
            try:
                os.chdir(root)
                agent.apply_artifact(artifact)
            finally:
                os.chdir(old)
            self.assertEqual((root / 'server/new.ts').read_text(), 'export const ok = true;\n')

if __name__ == '__main__':
    unittest.main()
