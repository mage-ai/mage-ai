import os
import re


def clean_name(name):
    for c in ['\ufeff', '\uFEFF', '"', '$', '\n', '\r', '\t']:
        name = name.replace(c, '')
    name = re.sub('\W', '_', name)

    if name and re.match('\d', name[0]):
        name = f'letter_{name}'
    return name.lower()


def files_in_path(path, verbose=0):
    files = []
    # r=root, d=directories, f = files
    for r, d, f in os.walk(path):
        for file in f:
            files.append(os.path.join(r, file))

    if verbose >= 1:
        for f in files:
            print(f)

    return files


def files_in_single_path(path):
    f = []
    for (dirpath, dirnames, filenames) in os.walk(path):
        f.extend([os.path.join(dirpath, file) for file in filenames])
        break
    return f
