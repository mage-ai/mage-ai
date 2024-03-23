import glob
import os
from pathlib import Path
from typing import Callable, Dict, List, Tuple

import aiofiles

from mage_ai.shared.environments import is_debug


def reverse_readline(filename, buf_size=8192):
    """A generator that returns the lines of a file in reverse order"""
    with open(filename, 'rb') as fh:
        segment = None
        offset = 0
        fh.seek(0, os.SEEK_END)
        file_size = remaining_size = fh.tell()
        while remaining_size > 0:
            offset = min(file_size, offset + buf_size)
            fh.seek(file_size - offset)
            buffer = fh.read(min(remaining_size, buf_size)).decode(encoding='utf-8')
            remaining_size -= buf_size
            lines = buffer.split('\n')
            # The first line of the buffer is probably not a complete line so
            # we'll save it and append it to the last line of the next buffer
            # we read
            if segment is not None:
                # If the previous chunk starts right from the beginning of line
                # do not concat the segment to the last line of new chunk.
                # Instead, yield the segment first
                if buffer[-1] != '\n':
                    lines[-1] += segment
                else:
                    yield segment
            segment = lines[0]
            for index in range(len(lines) - 1, 0, -1):
                if lines[index]:
                    yield lines[index]
        # Don't yield None if the file was empty
        if segment is not None:
            yield segment


def read_last_line(filename: str) -> str:
    with open(filename, 'rb') as f:
        try:  # catch OSError in case of a one line file
            f.seek(-2, os.SEEK_END)
            while f.read(1) != b'\n':
                f.seek(-2, os.SEEK_CUR)
        except OSError:
            f.seek(0)
        last_line = f.readline().decode()

        return last_line


def get_full_file_paths_containing_item(root_full_path: str, comparator: Callable) -> List[str]:
    configfiles = [os.path.join(
        dirpath,
        f,
    ) for dirpath, dirnames, files in os.walk(root_full_path) for f in files if comparator(f)]

    return configfiles


def get_full_file_paths_containing_multi_items(
    root_full_path: str,
    comparators: Dict[str, Callable],
    exclude_hidden_dir: bool = False,
) -> Dict[str, List]:
    configfiles = dict()
    for key, _ in comparators.items():
        configfiles[key] = []
    for dirpath, dirnames, files in os.walk(root_full_path):
        if exclude_hidden_dir:
            dirnames[:] = [d for d in dirnames if not d.startswith('.')]
        for f in files:
            for key, comparator in comparators.items():
                if comparator(f):
                    configfiles[key].append(os.path.join(dirpath, f))
    return configfiles


def find_directory(top_level_path: str, comparator: Callable) -> str:
    for path, _subdirs, files in os.walk(top_level_path):
        for name in files:
            full_path = os.path.join(path, name)
            if comparator(full_path):
                return full_path


def get_absolute_paths_from_all_files(
    starting_full_path_directory: str,
    comparator: Callable = None,
    include_hidden_files: bool = False,
    parse_values: Callable = None,
) -> List[Tuple[str, int, str]]:
    dir_path = os.path.join(starting_full_path_directory, './**/*')

    arr = []
    for filename in glob.iglob(dir_path, recursive=True):
        absolute_path = os.path.abspath(filename)

        if os.path.isfile(absolute_path) and \
                (not include_hidden_files or not absolute_path.startswith('.')) and \
                (not comparator or comparator(absolute_path)):

            value = (absolute_path, os.path.getsize(filename), round(os.path.getmtime(filename)))
            arr.append(parse_values(value) if parse_values else value)

    return arr


def find_file_from_another_file_path(file_path: str, comparator) -> str:
    if not file_path or not comparator:
        return

    if not os.path.isdir(file_path):
        file_path = os.path.dirname(file_path)

    parts = Path(file_path).parts

    absolute_file_path = None

    while len(parts) > 1 and absolute_file_path is None:
        if len(parts) == 0:
            return

        fp = os.path.join(*parts)
        for fn in os.listdir(fp):
            afp = os.path.join(fp, fn)
            if afp is not None and comparator(afp):
                absolute_file_path = afp
                break

        parts = parts[:-1]

    return absolute_file_path


async def read_async(file_path: str) -> str:
    dirname = os.path.dirname(file_path)
    if not os.path.isdir(dirname):
        os.mkdir(dirname)

    async with aiofiles.open(file_path, mode='r') as file:
        try:
            return await file.read()
        except Exception as err:
            if is_debug():
                print(f'[ERROR] files.read_async: {err}.')
