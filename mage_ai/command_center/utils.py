import os
from pathlib import Path
from typing import Dict


def shorten_directory(full_path: str) -> Dict:
    # Use Path object for simplicity and cross-platform compatibility
    path_obj = Path(full_path)
    parts = path_obj.parts
    parts_count = len(parts)

    # Initialize dir_name as an empty string
    dir_name = ""
    # Handle directory part; ignore the filename in parts
    if parts_count > 1:
        # Join all parts except the last one (filename)
        dir_name = os.path.join(*parts[: parts_count - 1])

    # Simplifying the directory to show only relevant parts (3 levels up max)
    if parts_count >= 4:
        if parts_count > 4:
            # For deeply nested paths, show as relative path starting with ..
            relevant_parts = parts[-3:]
            dir_name = os.path.join("..", *relevant_parts)
        else:
            # If exactly 4 levels deep, show entire path
            dir_name = os.path.join(*parts[:-1])

    # Extracting extension (without the dot)
    extension = (
        path_obj.suffix[1:] if path_obj.suffix.startswith(".") else path_obj.suffix
    )

    # Include the filename in the output
    filename = path_obj.name

    return dict(
        directory=dir_name,
        extension=extension,
        parts=parts[:-1],  # Exclude the filename from 'parts'
        filename=filename,
    )
