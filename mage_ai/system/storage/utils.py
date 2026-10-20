import glob
import os
from typing import Optional


def size_of_path(
    full_path_or_directory: str, file_extension: Optional[str] = None
) -> Optional[int]:
    try:
        if os.path.isdir(full_path_or_directory):
            return __size_of_directory(full_path_or_directory, file_extension)
        return os.path.getsize(full_path_or_directory)
    except FileNotFoundError:
        return None
    except Exception as e:
        print(f'[ERROR] system.storage.utils.size: {e}')


def __size_of_directory(directory: str, file_extension: Optional[str] = None) -> int:
    total_size = 0
    path = (
        os.path.join(directory, f'*.{file_extension}')
        if file_extension
        else os.path.join(directory, '*')
    )

    for parquet_file in glob.glob(path):
        total_size += os.path.getsize(parquet_file)
    return total_size
