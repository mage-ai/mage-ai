from mage_ai.autocomplete.utils import extract_all_imports
from mage_ai.data_preparation.repo_manager import get_repo_path
import importlib
import re


def reload_all_repo_modules(content: str) -> None:
    parts = get_repo_path().split('/')
    project_name = parts[-1]

    for line in extract_all_imports(content):
        if f'import {project_name}' not in line and f'from {project_name}' not in line:
            continue

        regex = re.compile(r'from ([\w.]+) import|import ([\w.]+)')
        matches = re.findall(regex, line)

        if len(matches) >= 1:
            m1, m2 = matches[0]
            importlib.reload(importlib.import_module(m1 or m2))
