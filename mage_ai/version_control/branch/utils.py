from typing import List

from mage_ai.shared.strings import capitalize_remove_underscore_lower


async def push(branch) -> List[str]:
    from git.exc import GitCommandError

    from mage_ai.data_preparation.git.api import push_raw

    project = branch.project
    user = project.user
    provider = user.provider

    if not branch.remote:
        return await branch.update_async(push=True)

    if not project.access_token:
        return branch.add_outputs([
            (
                f'Please authenticate with {capitalize_remove_underscore_lower(provider.name)} '
                'before trying to push.'
            ),
        ])

    try:
        custom_progress = push_raw(
            project.repo,
            branch.remote.name,
            branch.remote.url,
            branch.name,
            project.access_token,
        )
        if custom_progress and custom_progress.other_lines:
            return branch.add_outputs(custom_progress.other_lines)
    except GitCommandError as err:
        return branch.add_outputs([str(err)])

    #     elif action_type == 'push':
    #         if action_remote:
    #             from git.exc import GitCommandError

    #             try:
    #                 if token:
    #                     custom_progress = api.push(
    #                         action_remote,
    #                         url,
    #                         action_branch,
    #                         token,
    #                         config_overwrite=config_overwrite,
    #                     )
    #                     if custom_progress.other_lines:
    #                         lines = custom_progress.other_lines
    #                         if isinstance(lines, list):
    #                             lines = '\n'.join(lines)
    #                         self.model['progress'] = lines
    #                 else:
    #                     self.model[
    #                         'error'
    #                     ] = 'Please authenticate with {} before trying to push.'.format(
    #                         capitalize_remove_underscore_lower(provider),
    #                     )
    #             except GitCommandError as err:
    #                 self.model['error'] = str(err)
    #         else:
    #             git_manager.push()
    #     elif action_type == 'pull':
    #         if action_remote:
    #             from git.exc import GitCommandError

    #             try:
    #                 if token:
    #                     custom_progress = None
    #                     if action_branch:
    #                         custom_progress = api.pull(
    #                             action_remote,
    #                             url,
    #                             action_branch,
    #                             token,
    #                             config_overwrite=config_overwrite,
    #                         )
    #                     else:
    #                         custom_progress = api.fetch(
    #                             action_remote,
    #                             url,
    #                             token,
    #                             config_overwrite=config_overwrite,
    #                         )

    #                     if custom_progress and custom_progress.other_lines:
    #                         lines = custom_progress.other_lines
    #                         if isinstance(lines, list):
    #                             lines = '\n'.join(lines)
    #                         self.model['progress'] = lines
    #                 else:
    #                     self.model[
    #                         'error'
    #                     ] = 'Please authenticate with {} before trying to pull.'.format(
    #                         capitalize_remove_underscore_lower(provider),
    #                     )
    #             except GitCommandError as err:
    #                 self.model['error'] = str(err)
    #         else:
    #             git_manager.pull()
    #     elif action_type == 'fetch':
    #         if action_remote:
    #             from git.exc import GitCommandError

    #             try:
    #                 if token:
    #                     custom_progress = api.fetch(
    #                         action_remote,
    #                         url,
    #                         token,
    #                         config_overwrite=config_overwrite,
    #                     )

    #                     if custom_progress and custom_progress.other_lines:
    #                         lines = custom_progress.other_lines
    #                         if isinstance(lines, list):
    #                             lines = '\n'.join(lines)
    #                         self.model['progress'] = lines
    #                 else:
    #                     self.model[
    #                         'error'
    #                     ] = 'Please authenticate with {} before trying to fetch.'.format(
    #                         capitalize_remove_underscore_lower(provider),
    #                     )
    #             except GitCommandError as err:
    #                 self.model['error'] = str(err)
    #         else:
    #             self.model['error'] = 'Please specify a remote for the fetch command'
    #     elif action_type == 'reset':
    #         if files and len(files) >= 1:
    #             for file_path in files:
    #                 git_manager.reset_file(file_path)
    #         else:
    #             if action_remote:
    #                 from git.exc import GitCommandError

    #                 try:
    #                     if token:
    #                         api.reset_hard(
    #                             action_remote,
    #                             url,
    #                             action_branch,
    #                             token,
    #                             config_overwrite=config_overwrite,
    #                         )
    #                     else:
    #                         self.model[
    #                             'error'
    #                         ] = 'Please authenticate with {} before trying to reset.'.format(
    #                             capitalize_remove_underscore_lower(provider),
    #                         )
    #                 except GitCommandError as err:
    #                     self.model['error'] = str(err)
    #     elif action_type == 'clone':
    #         if action_remote:
    #             from git.exc import GitCommandError

    #             try:
    #                 if token:
    #                     api.clone(
    #                         action_remote,
    #                         url,
    #                         token,
    #                         config_overwrite=config_overwrite,
    #                     )
    #                 else:
    #                     self.model[
    #                         'error'
    #                     ] = 'Please authenticate with {} before trying to clone.'.format(
    #                         capitalize_remove_underscore_lower(provider),
    #                     )
    #             except GitCommandError as err:
    #                 self.model['error'] = str(err)
    #         else:
    #             git_manager.clone()
