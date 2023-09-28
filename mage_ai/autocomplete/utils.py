from functools import reduce
from mage_ai.shared.utils import files_in_path
import aiofiles
import importlib
import os
import pathlib
import re


root_path = '/'.join(str(pathlib.Path(__file__).parent.resolve()).split('/')[:-2])


FILE_EXTENSIONS_TO_INCLUDE = [
    '.py',
]
PATHS_TO_TRAVERSE = [
    f'{root_path}/mage_ai/io',
]
FILES_TO_READ = [
    f'{root_path}/mage_ai/data_cleaner/transformer_actions/constants.py',
    f'{root_path}/mage_ai/data_cleaner/transformer_actions/utils.py',
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
    regex_base = r'([A-Za-z_]+)\(*[A-Za-z_, ]*\)*:'
    regex = re.compile(f'^class {regex_base}|\nclass {regex_base}')
    return [t[0] or t[1] for t in re.findall(regex, file_content)]


def extract_all_constants(file_content):
    regex_base = '([A-Z_]+)[ ]*=[ ]*'
    regex = re.compile(f'^{regex_base}|\n{regex_base}')
    return [t[0] or t[1] for t in re.findall(regex, file_content)]


def extract_all_functions(file_content):
    regex_base = r'([A-Za-z_]+)\('
    regex = re.compile(f'^def {regex_base}|\ndef {regex_base}')
    return [t[0] or t[1] for t in re.findall(regex, file_content)]


def extract_all_imports(file_content, ignore_nesting=False):
    base_regexes = [
        r'import [\w.]+ as [\w.]+',
        r'import [\w.]+',
        r'from [\w.]+ import [\w.]+ as [\w.]+',
        r'from [\w.]+ import [\w.]+',
    ]
    regexes = []

    if ignore_nesting:
        for regex in base_regexes:
            regexes.append(f'^{regex}')
            regexes.append(f'\n{regex}')
    else:
        regexes += base_regexes

    regex = re.compile(f'({"|".join(regexes)})')
    return [s.strip() for s in re.findall(regex, file_content)]


async def build_file_content_mapping(paths, files):
    file_content_mapping = {}
    file_names = reduce(add_file, paths, files)

    cwd = os.getcwd()
    for file_name in file_names:
        async with aiofiles.open(file_name, mode='r') as f:
            file_content = await f.read()

        file_name = file_name.replace(f'{cwd}/', '').replace(f'{root_path}/', '')
        files = []
        parts = file_name.split('/')
        module_name = '.'.join(parts).replace('.py', '')

        if '__init__.py' == parts[-1]:
            path_sub = '/'.join(parts[:len(parts) - 1])
            files += [fn for fn in reduce(add_file, [path_sub], []) if fn != file_name]
            module_name = module_name.replace('.__init__', '')

        methods_for_class = {}
        all_classes = extract_all_classes(file_content)
        for class_name in all_classes:
            try:
                klass = getattr(
                    importlib.import_module(module_name),
                    class_name,
                )
                methods_for_class[class_name] = list(filter(
                    lambda x: not re.match('^_', x),
                    dir(klass),
                ))
            except ImportError as err:
                print(err)

        file_content_mapping[file_name] = dict(
            classes=all_classes,
            constants=extract_all_constants(file_content),
            files=files,
            functions=extract_all_functions(file_content),
            imports=extract_all_imports(file_content),
            methods_for_class=methods_for_class,
        )

    return file_content_mapping
