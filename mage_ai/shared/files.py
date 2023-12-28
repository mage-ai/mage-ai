import os
from typing import Callable, List


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


def find_directory(top_level_path: str, comparator: Callable) -> str:
    for path, _subdirs, files in os.walk(top_level_path):
        for name in files:
            full_path = os.path.join(path, name)
            if comparator(full_path):
                return full_path
