from mage_ai.shared.utils import files_in_path
from functools import reduce
import os
import re


FILE_EXTENSIONS_TO_INCLUDE = [
    '.py',
]
PATHS_TO_TRAVERSE = [
    'mage_ai/io',
]
FILES_TO_READ = [
    'mage_ai/data_cleaner/transformer_actions/constants.py',
    'mage_ai/data_cleaner/transformer_actions/utils.py',
]


def add_file(acc, path):
    files = files_in_path(path)

    def __should_include(file_name):
        tup = os.path.splitext(file_name)
        if (len(tup) >= 2):
            file_extension = tup[1]
            return file_extension in FILE_EXTENSIONS_TO_INCLUDE

        return True

    return acc + list(filter(__should_include, files))


def extract_all_classes(file_content):
    regex_base = '([A-Za-z_]+)\(*[A-Za-z_, ]*\)*:'
    regex = re.compile(f'^class {regex_base}|\nclass {regex_base}')
    return [t[0] or t[1] for t in re.findall(regex, file_content)]


def extract_all_constants(file_content):
    regex_base = '([A-Z_]+)[ ]*=[ ]*'
    regex = re.compile(f'^{regex_base}|\n{regex_base}')
    return [t[0] or t[1] for t in re.findall(regex, file_content)]


def extract_all_functions(file_content):
    regex_base = '([A-Za-z_]+)\('
    regex = re.compile(f'^def {regex_base}|\ndef {regex_base}')
    return [t[0] or t[1] for t in re.findall(regex, file_content)]


def build_file_content_mapping(paths, files):
    file_content_mapping = {}
    file_names = reduce(add_file, paths, files)

    for file_name in file_names:
        file_content = ''
        with open(file_name, 'r') as f:
            file_content = f.read()
            f.close()

        files = []
        parts = file_name.split('/')
        if '__init__.py' == parts[-1]:
            path_sub = '/'.join(parts[:len(parts) - 1])
            files += [fn for fn in reduce(add_file, [path_sub], []) if fn != file_name]

        file_content_mapping[file_name] = dict(
            classes=extract_all_classes(file_content),
            constants=extract_all_constants(file_content),
            files=files,
            functions=extract_all_functions(file_content),
        )

    return file_content_mapping


build_file_content_mapping(PATHS_TO_TRAVERSE, FILES_TO_READ)
