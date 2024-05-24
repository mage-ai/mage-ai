import os
import shutil
import traceback
from typing import Callable, Optional, Union

import aiofiles


def chmod(path: Union[str, os.PathLike], mode: int, append: bool = True) -> None:
    """Recursively runs chmod against the path and either adds or sets the permission

    Args:
        path (Union[str, os.PathLike]): Path to recursively run chmod on
        mode (int): Permissions in octal e.g. 0o0700 for rwx for owner
        append (bool, optional):
            Whether to extend the permissions by appending or set them. Defaults to True.
    """
    try:
        current_mode = os.stat(path).st_mode
        if append:
            mode = current_mode | mode

        os.chmod(path, mode)
        for dirpath, _dirnames, filenames in os.walk(path):
            os.chmod(dirpath, mode)
            for filename in filenames:
                os.chmod(os.path.join(dirpath, filename), mode)
    except Exception:
        traceback.print_exc()


def safe_write(
    filepath: str, content: str, write_func: Optional[Callable] = None, write_mode: str = 'w'
):
    temp_file_path = filepath + '.temp'
    if os.path.isfile(filepath):
        shutil.copy2(filepath, temp_file_path)
        prev_existed = True
    else:
        prev_existed = False

    success = False
    try:
        with open(filepath, write_mode, encoding='utf-8') as fp:
            if write_func is not None:
                write_func(fp, content)
            else:
                fp.write(content)
        success = True
    except Exception as e:
        raise e
    finally:
        if not success and prev_existed:
            shutil.copy2(temp_file_path, filepath)
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        except Exception:
            traceback.print_exc()


async def safe_write_async(
    filepath: str, content: str, write_func: Optional[Callable] = None, write_mode: str = 'w'
):
    temp_file_path = filepath + '.temp'
    if os.path.isfile(filepath):
        shutil.copy2(filepath, temp_file_path)
        prev_existed = True
    else:
        prev_existed = False

    success = False
    try:
        async with aiofiles.open(filepath, mode=write_mode, encoding='utf-8') as fp:
            if write_func is not None:
                await write_func(fp, content)
            else:
                await fp.write(content)

        success = True
    except Exception as e:
        raise e
    finally:
        if not success and prev_existed:
            shutil.copy2(temp_file_path, filepath)
        try:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
        except Exception:
            traceback.print_exc()


async def read_last_line_async(file_path: str) -> str:
    if not file_path:
        return

    # https://stackoverflow.com/questions/46258499/how-to-read-the-last-line-of-a-file-in-python
    async with aiofiles.open(file_path, mode='rb') as f:
        # catch OSError in case of a one line file
        try:
            f.seek(-2, os.SEEK_END)
            while f.read(1) != b'\n':
                f.seek(-2, os.SEEK_CUR)
        except OSError:
            f.seek(0)

        return f.readline().decode()
