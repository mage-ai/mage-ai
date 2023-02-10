import aiofiles
import os
import shutil


def safe_write(filepath: str, content: str):
    temp_file_path = filepath + '.temp'
    if os.path.isfile(filepath):
        print(f'Path {filepath} exists')
        shutil.copy2(filepath, temp_file_path)
        prev_existed = True
    else:
        prev_existed = False

    success = False    
    try:
        with open(filepath, 'w') as fp:
            fp.write(content)
        success = True
    except Exception as e:
        raise e
    finally:
        if not success and prev_existed:
            shutil.copy2(temp_file_path, filepath)
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


async def safe_write_async(filepath: str, content: str):
    temp_file_path = filepath + '.temp'
    if os.path.isfile(filepath):
        shutil.copy2(filepath, temp_file_path)
        prev_existed = True
    else:
        prev_existed = False

    success = False    
    try:
        async with aiofiles.open(filepath, mode='w') as fp:
            await fp.write(content)

        success = True
    except Exception as e:
        raise e
    finally:
        if not success and prev_existed:
            shutil.copy2(temp_file_path, filepath)
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
