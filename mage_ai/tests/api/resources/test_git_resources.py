import asyncio
import time
from unittest import IsolatedAsyncioTestCase
from unittest.mock import MagicMock, patch

from mage_ai.api.presenters.GitCustomBranchPresenter import GitCustomBranchPresenter
from mage_ai.api.resources.GitBranchResource import GitBranchResource
from mage_ai.api.resources.SyncResource import SyncResource


class GitResourceTest(IsolatedAsyncioTestCase):
    async def test_push_does_not_block_event_loop(self):
        await asyncio.to_thread(lambda: None)
        git_manager = MagicMock()
        resource = GitBranchResource({}, None)

        def push(*args, **kwargs):
            time.sleep(0.2)
            return MagicMock(other_lines=[])

        with patch.object(resource, 'get_git_manager', return_value=git_manager), patch.object(
            resource,
            'get_oauth_config',
            return_value=('token', 'github', 'https://example.com/repo.git', None),
        ), patch('mage_ai.api.resources.GitBranchResource.api.push', side_effect=push):
            task = asyncio.create_task(
                resource.update(
                    {
                        'action_type': 'push',
                        'action_payload': {'branch': 'main', 'remote': 'origin'},
                    }
                )
            )
            started_at = time.monotonic()
            await asyncio.sleep(0.01)

            self.assertLess(time.monotonic() - started_at, 0.1)
            self.assertFalse(task.done())
            await task

    async def test_remote_details_do_not_block_event_loop(self):
        await asyncio.to_thread(lambda: None)
        resource = GitBranchResource({}, None)
        resource.remotes = MagicMock(
            side_effect=lambda **kwargs: time.sleep(0.2) or [],
        )
        presenter = GitCustomBranchPresenter(resource, None)

        task = asyncio.create_task(presenter.present(format='with_remotes'))
        started_at = time.monotonic()
        await asyncio.sleep(0.01)

        self.assertLess(time.monotonic() - started_at, 0.1)
        self.assertFalse(task.done())
        await task

    async def test_git_sync_does_not_block_event_loop(self):
        await asyncio.to_thread(lambda: None)
        sync = MagicMock()
        sync.sync_data.side_effect = lambda: time.sleep(0.2)
        resource = SyncResource({'user_git_settings': {}}, None)

        with patch(
            'mage_ai.api.resources.SyncResource.GitConfig.load',
            return_value=MagicMock(),
        ), patch(
            'mage_ai.api.resources.SyncResource.GitSync',
            return_value=sync,
        ):
            task = asyncio.create_task(resource.update({'action_type': 'sync_data'}))
            started_at = time.monotonic()
            await asyncio.sleep(0.01)

            self.assertLess(time.monotonic() - started_at, 0.1)
            self.assertFalse(task.done())
            await task
