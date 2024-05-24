import importlib
import re
from typing import Tuple

from jupyter_client import KernelClient

from mage_ai.autocomplete.utils import extract_all_imports
from mage_ai.settings.repo import get_repo_path


def reload_all_repo_modules(content: str, client: KernelClient) -> None:
    parts = get_repo_path(root_project=True).split('/')
    project_name = parts[-1]

    for line in extract_all_imports(content):
        if f'import {project_name}' not in line and f'from {project_name}' not in line:
            continue

        regex = re.compile(r'from ([\w.]+) import|import ([\w.]+)')
        matches = re.findall(regex, line)

        if len(matches) >= 1:
            m1, m2 = matches[0]
            try:
                importlib.reload(importlib.import_module(m1 or m2))
                client.execute(
                    f"""
import importlib
importlib.reload(importlib.import_module("{m1}" or "{m2}"))
                """
                )
            except Exception:
                pass


def extract_decorated_function(code: str, decorated_function_name: str) -> Tuple:
    spans = []

    span_current_start = None
    span_current_def = None

    lines = code.split('\n')
    number_of_lines = len(lines)

    for idx, line in enumerate(lines):
        if line and span_current_start is not None and span_current_def is not None:

            if line.startswith('@') or line.startswith('def '):
                spans.append(
                    (
                        span_current_start,
                        idx - 1,
                    )
                )
                span_current_start = None
                span_current_def = None

        if (
            line
            and span_current_start is not None
            and span_current_def is None
            and line.startswith('def ')
        ):

            span_current_def = idx

        if (
            line
            and span_current_start is None
            and line.startswith(f'@{decorated_function_name}')
        ):

            span_current_start = idx

        if (
            span_current_start is not None
            and span_current_def is not None
            and idx == number_of_lines - 1
        ):

            spans.append((span_current_start, idx))

    lines_left = []

    spans_len = len(spans)
    for idx, span in enumerate(spans):
        s, e = span

        if idx == 0 and s >= 1:
            lines_left.append('\n'.join(lines[:s]))

        s_n = None
        # Last span
        if idx == spans_len - 1:
            s_n = -1
        else:
            s_n, e_n = spans[idx + 1]

        lines_left.append('\n'.join(lines[e:s_n]))

    return (
        ['\n'.join(lines[s:e]) for s, e in spans],
        lines_left,
    )
