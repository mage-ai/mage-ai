import os
import shutil


def init_repo(repo_path: str) -> None:
    """
    Initialize a repository under the current path.
    """
    if os.path.exists(repo_path):
        return

    template_path = os.path.join(
        os.path.dirname(__file__),
        'templates/repo',
    )
    if not os.path.exists(template_path):
        raise IOError('Could not find templates for repo.')
    shutil.copytree(template_path, repo_path)
