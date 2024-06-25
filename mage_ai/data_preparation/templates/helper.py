import os
import re


# Function to parse the templates file
def parse_templates(file_path):
    with open(file_path, 'r') as file:
        data = file.read()

    # Regular expression to match the template sections
    pattern = r'### (\S+)\n\n```python\n(.*?)```'
    matches = re.findall(pattern, data, re.DOTALL)

    return matches


# Function to create the files from the parsed templates
def create_files_from_templates(templates):
    for filename, content in templates:
        # Determine the directory based on the filename
        dir_name = 'data_exporters/vector_databases'

        # Ensure the directory exists
        os.makedirs(dir_name, exist_ok=True)

        # Create the file with the given content
        file_path = os.path.join(dir_name, filename)
        with open(file_path, 'w') as file:
            file.write(content)

        print(f'Created file: {file_path}')


# Main script execution
if __name__ == '__main__':
    templates_file_path = 'templates.txt'
    templates = parse_templates(templates_file_path)
    create_files_from_templates(templates)
