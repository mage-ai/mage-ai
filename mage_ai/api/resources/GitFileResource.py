from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.models.file import File
from mage_ai.data_preparation.repo_manager import get_repo_name, get_repo_path
import urllib.parse
import os


class GitFileResource(GenericResource):
    @classmethod
    async def member(self, pk, user, **kwargs):
        repo_name = get_repo_name()

        file_path = urllib.parse.unquote(pk)
        file_path_without_repo_name = file_path
        file_path_parts = file_path_without_repo_name.split(os.sep)
        if len(file_path_parts) >= 1 and file_path_parts[0] == repo_name:
            file_path_without_repo_name = os.path.join(*file_path_parts[1:])

        file = File.from_path(file_path_without_repo_name, get_repo_path())
        if not file.exists():
            file = File.from_path(file_path_without_repo_name, '')

        git_manager = Git.get_manager(user=user)

        modified_files = git_manager.modified_files
        untracked_files = git_manager.untracked_files()
        is_modified = file_path in modified_files

        query = kwargs.get('query', {})
        base_branch = query.get('base_branch', [git_manager.current_branch])
        if base_branch:
            base_branch = base_branch[0]
        compare_branch = query.get('compare_branch', [git_manager.current_branch])
        if compare_branch:
            compare_branch = compare_branch[0]

        content_from_base = None
        content_from_compare = None
        if is_modified:
            content_from_base = git_manager.show_file_from_branch(base_branch, file_path)
            if base_branch == compare_branch:
                content_from_compare = content_from_base
            else:
                content_from_compare = git_manager.show_file_from_branch(compare_branch, file_path)

        return self(dict(
            content=file.content(),
            content_from_base=content_from_base,
            content_from_compare=content_from_compare,
            filename=file_path,
            modified=is_modified,
        ), user, **kwargs)
