import asyncio
import glob
import os
import re
import shutil
import time
from pathlib import Path
from typing import Any, Callable, Dict, List, Mapping, Optional, Tuple

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
    configfiles = [
        os.path.join(
            dirpath,
            f,
        )
        for dirpath, dirnames, files in os.walk(root_full_path)
        for f in files
        if comparator(f)
    ]

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

        if (
            os.path.isfile(absolute_path)
            and (not include_hidden_files or not absolute_path.startswith('.'))
            and (not comparator or comparator(absolute_path))
        ):
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


def safe_delete_dir_sync(output_dir, verbose: bool = False):
    max_attempts = 5
    for attempt in range(max_attempts):
        try:
            shutil.rmtree(output_dir)
            if verbose:
                print(f'Successfully deleted {output_dir}')
            break  # Successfully deleted; exit the loop
        except OSError as err:
            if attempt < max_attempts - 1:
                time.sleep(2)  # Wait a bit for retry
                continue
            else:
                print(f'Failed to delete {output_dir} after {max_attempts} attempts: {err}')
                raise err


async def safe_delete_dir_async(output_dir: str, verbose: bool = False):
    loop = asyncio.get_event_loop()
    max_attempts = 5

    for attempt in range(max_attempts):
        try:
            await loop.run_in_executor(None, shutil.rmtree, output_dir)
            if verbose:
                print(f'Successfully deleted {output_dir}')
            break  # Successfully deleted; exit the loop
        except OSError as err:
            # Handles the potential need for retry due to file locking/availability/etc.
            if attempt < max_attempts - 1:
                await asyncio.sleep(2)  # Non-blocking wait before retry
                continue
            else:
                print(f'Failed to delete {output_dir} after {max_attempts} attempts: {err}')
                raise


def makedirs_sync(path: str):
    os.makedirs(path, exist_ok=True)


async def makedirs_async(path: str):
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, os.makedirs, path, exist_ok=True)


async def write_async(
    path: str, data: Optional[str] = None, overwrite: Optional[bool] = None
) -> bool:
    if not overwrite and await exists_async(path):
        raise Exception(f'File already exists at {path}, cannot overwrite unless forced.')

    try:
        await makedirs_async(os.path.dirname(path))
        async with aiofiles.open(path, 'w') as file:
            await file.write('' if data is None else data)
        return True
    except Exception as err:
        if is_debug():
            print(f'[ERROR] files.write_async: {err}')
    return False


async def delete_async(path: str, ignore_exists: Optional[bool] = None) -> bool:
    if not ignore_exists and not await exists_async(path):
        raise Exception(f'File does not exist at {path}, cannot delete non-existent file.')

    try:
        await asyncio.to_thread(os.remove, path)
        return True
    except Exception as err:
        if is_debug():
            print(f'[ERROR] files.delete_async: {err}')
    return False


async def exists_async(path: str) -> bool:
    try:
        return await asyncio.to_thread(os.path.exists, path)
    except Exception:
        return False


async def move_async(old_path: str, new_path: str, overwrite: Optional[bool] = None) -> bool:
    if not overwrite and await exists_async(new_path):
        raise Exception(
            f'File already exists at {new_path}, cannot move {old_path} to {new_path}.'
        )

    try:
        await asyncio.to_thread(shutil.move, old_path, new_path)
        return True
    except Exception as err:
        if is_debug():
            print(f'[ERROR] files.move_async: {err}')
    return False


async def rename_async(old_path: str, new_path: str, overwrite: Optional[bool] = None) -> bool:
    if not overwrite and await exists_async(new_path):
        raise Exception(
            f'[ERROR] File already exists at {new_path}, cannot rename {old_path} to {new_path}.'
        )

    try:
        await asyncio.to_thread(os.rename, old_path, new_path)
        raise Exception(old_path, new_path)
        return True
    except Exception as err:
        if is_debug():
            print(f'[ERROR] files.move_async: {err}')
    return False


async def check_file(
    file_path: str,
    criteria: Mapping[str, List[str]],
    files_with_criteria: List[Dict[str, Any]],
):
    async with aiofiles.open(file_path, 'r') as file:
        content = await file.read()

        def __match(key: str, values: List[Optional[str]], content=content) -> bool:
            key_regex = (
                re.escape(key) + r'\s*:\s*([^\n#]+)'
            )  # Only match top-level key-value pairs
            key_match = re.search(key_regex, content, re.MULTILINE)

            if key_match and values is not None:
                return any(
                    value is not None
                    and re.search(
                        f'^{re.escape(key)}\\s*:\\s*{re.escape(value)}$', content, re.MULTILINE
                    )
                    for value in values
                )

            return False

        if all([__match(key, values) for key, values in criteria.items()]):
            files_with_criteria.append({
                'content': content,
                'dir_name': os.path.dirname(file_path),
                'file_path': file_path,
            })


async def find_files_with_criteria(
    directories: List[str], criteria: Mapping[str, List[str]]
) -> List[Dict[str, str]]:
    files_with_criteria = []

    tasks = []
    for directory in directories:
        for root, _, files in os.walk(directory):
            for filename in files:
                if filename.endswith('.yaml') or filename.endswith('.yml'):
                    file_path = os.path.join(root, filename)
                    tasks.append(check_file(file_path, criteria, files_with_criteria))

    await asyncio.gather(*tasks)
    return files_with_criteria


def remove_subpath(full_path: str, subpath: str) -> str:
    """
    Remove a specified subpath from the full path.
    """
    # Convert paths to use consistent separators if necessary
    full_path = str(Path(full_path).resolve())
    subpath = str(Path(subpath).resolve())

    # Replace subpath with an empty string if it exists within the full path
    return full_path.replace(subpath, '')
