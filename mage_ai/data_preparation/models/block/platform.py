import os
from pathlib import Path

from mage_ai.settings.platform import has_settings
from mage_ai.settings.repo import get_repo_path


def from_another_project(file_path: str) -> bool:
    if not has_settings():
        return False

    # Root path of the active project:
    # Examples:
    # default_repo
    # default_repo/demo_project
    # /home/src/default_repo
    # /home/src/default_repo/demo_project
    root_path = get_repo_path(
        absolute_path=os.path.isabs(file_path),
        root_project=False,
    )

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
        return True
