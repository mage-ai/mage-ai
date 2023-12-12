import os
from pathlib import Path

from mage_ai.settings.platform import has_settings
from mage_ai.settings.repo import get_repo_path


def from_another_project(file_path: str) -> bool:
    if not has_settings():
        return False

    is_absolute_path = os.path.isabs(file_path)

    # Root path of the active project:
    # Examples:
    # default_repo
    # default_repo/demo_project
    # /home/src/default_repo
    # /home/src/default_repo/demo_project
    root_path = get_repo_path(
        absolute_path=is_absolute_path,
        root_project=False,
    )

    # Check to see if it even has the root project repo in the file_path or any of the
    # sub-project’s repo path in the file path.
    # If it doesn't, then there is no way of telling if it’s in another project.
    # Example of a file path that cannot be determined:
    # dbt/demo/models/example/my_first_dbt_model.sql

    root_path_only = get_repo_path(
        absolute_path=is_absolute_path,
        root_project=True,
    )

    if not file_path.startswith(root_path_only):
        return False

    try:
        # file_path examples:
        # dbt/metrics/models/test.sql
        # default_repo/dbt/metrics/models/test.sql
        # default_repo/demo_project/dbt/metrics/models/test.sql
        # /home/src/default_repo/dbt/metrics/models/test.sql
        # /home/src/default_repo/demo_project/dbt/metrics/models/test.sql
        Path(file_path).relative_to(root_path)
        return False
    except ValueError:
        try:
            # Test:
            # default_repo
            # /home/src/default_repo
            Path(file_path).relative_to(root_path_only)
            return False
        except ValueError:
            return True
