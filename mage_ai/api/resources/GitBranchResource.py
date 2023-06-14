from mage_ai.api.errors import ApiError
from mage_ai.api.resources.GenericResource import GenericResource
from mage_ai.data_preparation.git import Git
from mage_ai.data_preparation.preferences import get_preferences
import os


def build_file_object(obj):
    arr = []
    for k, v in obj.items():
        children = build_file_object(v)
        arr.append(dict(
            children=children if len(children) >= 1 else None,
            name=k,
        ))

    return arr


class GitBranchResource(GenericResource):
    @classmethod
    def collection(self, query, meta, user, **kwargs):
        git_manager = Git.get_manager(user=user)
        return self.build_result_set(
            [dict(name=branch) for branch in git_manager.branches],
            user,
            **kwargs,
        )

    @classmethod
    def create(self, payload, user, **kwargs):
        branch = payload.get('name')
        git_manager = Git.get_manager(user=user)
        git_manager.switch_branch(branch)

        return self(dict(name=git_manager.current_branch), user, **kwargs)

    @classmethod
    async def member(self, pk, user, **kwargs):
        branch = None
        git_manager = Git.get_manager(user=user)

        files = {}

        modified_files = git_manager.modified_files
        staged_files = git_manager.staged_files()
        untracked_files = git_manager.untracked_files()

        for filename in modified_files + staged_files + untracked_files:
            # filename: default_repo/transformers/load.py
            parts = filename.split(os.sep)
            number_of_parts = len(parts)

            arr = []
            for idx, part in enumerate(parts):
                default_obj = dict()

                if idx == 0:
                    obj = files.get(part, default_obj)
                else:
                    obj_prev = arr[idx - 1]
                    obj = obj_prev.get(part, default_obj)

                arr.append(obj)

            obj_final = None
            for idx, obj in enumerate(reversed(arr)):
                if idx == 0:
                    obj_final = obj
                else:
                    part = parts[number_of_parts - idx]
                    obj[part] = obj_final
                    obj_final = obj

            files[parts[0]] = obj_final

        return self(dict(
            files=build_file_object(files),
            modified_files=modified_files,
            name=git_manager.current_branch,
            staged_files=staged_files,
            untracked_files=untracked_files,
        ), user, **kwargs)

    async def update(self, payload, **kwargs):
        git_manager = Git.get_manager(user=self.current_user)
        action_type = payload.get('action_type')
        if action_type == 'status':
            status = git_manager.status()
            untracked_files = git_manager.untracked_files()
            modified_files = git_manager.modified_files
            self.model = dict(
                name=git_manager.current_branch,
                status=status,
                untracked_files=untracked_files,
                modified_files=modified_files,
            )
        elif action_type == 'commit':
            message = payload.get('message')
            files = payload.get('files', None)
            if not message:
                error = ApiError.RESOURCE_ERROR
                error.update({
                    'message': 'Message is empty, please add a message for your commit.',
                })
                raise ApiError(error)
            git_manager.commit(message, files)
        elif action_type == 'push':
            git_manager.push()
        elif action_type == 'pull':
            git_manager.pull()
        elif action_type == 'reset':
            git_manager.reset()
        elif action_type == 'clone':
            git_manager.clone()

        return self
