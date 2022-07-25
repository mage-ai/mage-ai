import re


def clean_name(name):
    for c in ['\ufeff', '\uFEFF', '"', '$', '\n', '\r', '\t']:
        name = name.replace(c, '')
    name = re.sub('\W', '_', name)

    if name and re.match('\d', name[0]):
        name = f'letter_{name}'
    return name.lower()
