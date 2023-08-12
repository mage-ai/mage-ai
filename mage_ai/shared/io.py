import os
import shutil
import traceback
from typing import Callable

import aiofiles


def chmod(path, mode, append=True):
    # recursively runs chmod against the path and either adds or sets the permission(mode)
    try:
        current_mode = os.stat(path).st_mode
    except Exception as e:
        raise e
    if append:
        mode = current_mode | mode
    os.chmod(path, mode)
    for dirpath, _dirnames, filenames in os.walk(path):
        os.chmod(dirpath, mode)
        for filename in filenames:
            os.chmod(os.path.join(dirpath, filename), mode)


def safe_write(filepath: str, content: str, write_func: Callable = None):
    temp_file_path = filepath + '.temp'
    if os.path.isfile(filepath):
        shutil.copy2(filepath, temp_file_path)
        prev_existed = True
    else:
        prev_existed = False

    success = False
    try:
        with open(filepath, 'w') as fp:
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


async def safe_write_async(filepath: str, content: str, write_func: Callable = None):
    temp_file_path = filepath + '.temp'
    if os.path.isfile(filepath):
        shutil.copy2(filepath, temp_file_path)
        prev_existed = True
    else:
        prev_existed = False

    success = False
    try:
        async with aiofiles.open(filepath, mode='w') as fp:
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
