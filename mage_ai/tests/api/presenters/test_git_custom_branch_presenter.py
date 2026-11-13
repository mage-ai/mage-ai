from unittest.mock import AsyncMock, MagicMock

from mage_ai.api.presenters.GitCustomBranchPresenter import GitCustomBranchPresenter
from mage_ai.tests.base_test import AsyncDBTestCase


class GitCustomBranchPresenterTest(AsyncDBTestCase):
    def build_resource(self):
        resource = MagicMock()
        resource.model = dict(
            name='main',
            modified_files=[f'modified/{i}.py' for i in range(9)],
            staged_files=[f'staged/{i}.py' for i in range(120)],
            untracked_files=[f'untracked/{i}/metadata.yaml' for i in range(258)],
        )
        resource.files = AsyncMock(return_value={})
        return resource

    async def test_present_returns_all_files(self):
        resource = self.build_resource()

        data = await GitCustomBranchPresenter(resource, None).present(format='with_basic_details')
        self.assertEqual(data, dict(name='main'))

        data = await GitCustomBranchPresenter(resource, None).present(format='with_logs')
        self.assertEqual(len(data['modified_files']), 9)
        self.assertEqual(len(data['staged_files']), 120)
        self.assertEqual(len(data['untracked_files']), 258)

    async def test_present_with_files_does_not_limit_the_files(self):
        resource = self.build_resource()

        await GitCustomBranchPresenter(resource, None).present(format='with_files')

        modified_files, staged_files, untracked_files = resource.files.call_args.args
        self.assertEqual(len(modified_files), 9)
        self.assertEqual(len(staged_files), 120)
        self.assertEqual(len(untracked_files), 258)
        self.assertNotIn('limit', resource.files.call_args.kwargs)
