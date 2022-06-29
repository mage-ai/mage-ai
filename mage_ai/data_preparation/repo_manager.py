from mage_ai.data_preparation.templates.utils import copy_templates
import os


def init_repo(repo_path: str) -> None:
    """
    Initialize a repository under the current path.
    """
    if os.path.exists(repo_path):
        return

    copy_templates('repo', repo_path)
