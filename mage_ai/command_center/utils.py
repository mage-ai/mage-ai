import os
from pathlib import Path
from typing import Dict


def shorten_directory(full_path: str) -> Dict:
    parts = Path(os.path.dirname(full_path)).parts
    parts_count = len(parts)
    dir_name = ''
    if parts_count >= 1:
        os.path.join(*parts[max([0, parts_count - 3]):])

    if parts_count >= 4:
        if parts_count >= 5:
            dir_name = os.path.join('.', dir_name)
        else:
            dir_name = os.path.join('..', dir_name)

        for _i in range(min(1, parts_count - 4)):
            dir_name = os.path.join('..', dir_name)

    extension = Path(full_path or '').suffix
    if extension:
        extension = extension.replace('.', '')

    return dict(
        directory=dir_name,
        extension=extension,
        parts=parts,
    )
