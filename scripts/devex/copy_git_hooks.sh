#!/bin/bash

# this script will copy all of the files from one directory into another, and makes them executable
#### usage:
# >>> ./copy_and_make_executable.sh /path/to/source_directory /path/to/destination_directory

# Check if the correct number of arguments are provided
if [ "$#" -ne 2 ]; then
  echo "Usage: $0 <source_directory> <destination_directory>"
  exit 1
fi

src_dir="$1"
dst_dir="$2"

# Check if the source and destination directories exist
if [ ! -d "$src_dir" ]; then
  echo "Error: Source directory '$src_dir' does not exist."
  exit 1
fi

if [ ! -d "$dst_dir" ]; then
  echo "Error: Destination directory '$dst_dir' does not exist."
  exit 1
fi

# Loop through files in the source directory
for file in "$src_dir"/*; do
  # Copy the file to the destination directory
  cp "$file" "$dst_dir"

  # Get the filename without the path
  filename="$(basename "$file")"

  # Make the copied file executable
  chmod +x "$dst_dir/$filename"
done

echo "Files copied and made executable successfully."
