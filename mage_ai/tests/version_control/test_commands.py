import asyncio
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

from mage_ai.api.errors import ApiError
from mage_ai.api.resources.VersionControlFileResource import VersionControlFileResource
from mage_ai.version_control.commands import parse_read_command
from mage_ai.version_control.models import BaseVersionControl, Branch, File, Remote


class ReadCommandTests(unittest.TestCase):
    def test_supported_read_commands(self):
        for command in ['git status --short', 'log --oneline --max-count=5',
                        'diff --staged -- file.py', 'show HEAD:file.py', 'log -5']:
            with self.subTest(command=command):
                self.assertIn(parse_read_command(command)[0], {'status', 'log', 'diff', 'show'})

    def test_rejects_execution_and_configuration_options(self):
        for command in [
            '', 'git', 'gitty status', 'git -c alias.pwn=!id pwn', 'config core.sshCommand id',
            'rebase --exec id HEAD', 'fetch --upload-pack=id origin', 'submodule update --init',
            'status --help', 'log --output=/tmp/file', 'show --textconv', 'diff --ext-diff',
            'status; touch marker', 'status && touch marker', 'log --format=%x00', '"',
        ]:
            with self.subTest(command=command), self.assertRaises(ValueError):
                parse_read_command(command)

    def test_disables_diff_helpers(self):
        for command in ['log', 'diff', 'show']:
            self.assertEqual(parse_read_command(command)[1:3], ['--no-ext-diff', '--no-textconv'])


class FileCommandIntegrationTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(prefix='mage git tests ')
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name)
        previous_directory = os.getcwd()
        os.chdir(self.path)
        self.addCleanup(os.chdir, previous_directory)
        self.git('init')
        self.git('config', 'user.name', 'Test User')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'commit.gpgsign', 'false')
        self.git('config', 'core.hooksPath', '/dev/null')
        self.project = SimpleNamespace(repo_path=str(self.path))
        self.file = File(project=self.project, name='file with spaces.txt')
        (self.path / self.file.name).write_text('initial\n')

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.path), *args], text=True)

    async def test_stage_commit_diff_and_unstage_with_literal_arguments(self):
        await self.file.update_async(add=self.file.name)
        message = 'Literal "quotes", $(touch marker), `touch marker`, and ; in commit'
        await self.file.update_async(commit=message)
        self.assertEqual(self.git('log', '-1', '--format=%s').strip(), message)
        self.assertFalse((self.path / 'marker').exists())
        (self.path / self.file.name).write_text('changed\n')
        self.file.output = []
        diff = await self.file.detail_async()
        self.assertTrue(any('+changed' in line for line in diff))
        await self.file.update_async(add=self.file.name)
        self.assertIn(self.file.name, self.git('diff', '--cached', '--name-only'))
        await self.file.update_async(reset=self.file.name)
        self.assertEqual(self.git('diff', '--cached', '--name-only'), '')
        self.file.delete()
        self.assertEqual((self.path / self.file.name).read_text(), 'initial\n')

    async def test_shell_payload_in_filename_is_literal(self):
        name = 'file; touch marker'
        (self.path / name).write_text('literal\n')
        await self.file.update_async(add=name)
        self.assertFalse((self.path / 'marker').exists())
        self.assertIn(name, self.git('diff', '--cached', '--name-only'))

    async def test_flag_like_filename_is_literal(self):
        name = '--help'
        (self.path / name).write_text('literal\n')
        await self.file.update_async(add=name)
        self.assertIn(name, self.git('diff', '--cached', '--name-only'))

    async def test_generic_status_and_log_work(self):
        await self.file.update_async(add='.')
        await self.file.update_async(commit='initial')
        self.file.output = []
        result = await self.file.update_async(command='git log --oneline')
        self.assertTrue(any('initial' in line for line in result))
        self.file.output = []
        await self.file.update_async(command='git status --short')

    async def test_read_commands_do_not_execute_external_diff_helpers(self):
        await self.file.update_async(add='.')
        await self.file.update_async(commit='initial')
        (self.path / self.file.name).write_text('changed\n')
        self.git('config', 'diff.external', "sh -c 'touch marker'")
        await self.file.detail_async()
        for command in ['diff', 'show HEAD', 'log --stat']:
            await self.file.update_async(command=command)
        self.assertFalse((self.path / 'marker').exists())

    async def test_generic_execution_payload_rejected_before_spawn(self):
        for command in ['status; touch marker', 'git -c core.pager=id log',
                        'rebase --exec "touch marker" HEAD']:
            with self.subTest(command=command):
                with patch('asyncio.create_subprocess_exec') as spawn:
                    with self.assertRaises(ValueError):
                        await self.file.update_async(command=command)
                    spawn.assert_not_called()
        self.assertFalse((self.path / 'marker').exists())

    async def test_async_runner_does_not_interpret_shell_syntax(self):
        model = BaseVersionControl(project=self.project)
        await model.run_async('status; touch marker')
        self.assertFalse((self.path / 'marker').exists())

    async def test_branch_parameter_cannot_inject_git_options(self):
        branch = Branch(project=self.project, name='--exec=touch marker')
        with patch('asyncio.create_subprocess_exec') as spawn:
            with self.assertRaises(ValueError):
                await branch.update_async(rebase=True)
            spawn.assert_not_called()

    async def test_branch_checkout_uses_literal_arguments(self):
        await self.file.update_async(add='.')
        await self.file.update_async(commit='initial')
        self.git('branch', 'feature/security')
        branch = Branch(project=self.project, name='feature/security')
        await branch.update_async(checkout=True)
        self.assertEqual(self.git('branch', '--show-current').strip(), 'feature/security')

    async def test_clone_rejects_remote_helpers(self):
        branch = Branch(project=self.project, name='main', remote=Remote(url='ext::touch marker'))
        with patch('asyncio.create_subprocess_exec') as spawn:
            with self.assertRaises(ValueError):
                await branch.update_async(clone=True)
            spawn.assert_not_called()

    async def test_timeout_kills_and_reaps_process(self):
        process = SimpleNamespace(
            communicate=AsyncMock(side_effect=asyncio.TimeoutError),
            kill=Mock(), wait=AsyncMock(), returncode=None,
        )
        with patch('asyncio.create_subprocess_exec', AsyncMock(return_value=process)):
            with self.assertRaises(asyncio.TimeoutError):
                await self.file.run_async(['status'], timeout=0.01)
        process.kill.assert_called_once()
        process.wait.assert_awaited_once()

    async def test_cancellation_kills_and_reaps_process(self):
        process = SimpleNamespace(
            communicate=AsyncMock(side_effect=asyncio.CancelledError),
            kill=Mock(), wait=AsyncMock(), returncode=None,
        )
        with patch('asyncio.create_subprocess_exec', AsyncMock(return_value=process)):
            with self.assertRaises(asyncio.CancelledError):
                await self.file.run_async(['status'])
        process.kill.assert_called_once()
        process.wait.assert_awaited_once()

    async def test_api_returns_validation_error_for_unsafe_command(self):
        resource = SimpleNamespace(model=self.file, validate_output=Mock())
        with self.assertRaises(ApiError) as caught:
            await VersionControlFileResource.update(resource, {'command': 'rebase --exec id HEAD'})
        self.assertEqual(caught.exception.code, 400)
        resource.validate_output.assert_not_called()
