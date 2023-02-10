from typing import Callable
import aiofiles
import os
import shutil


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
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


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
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
