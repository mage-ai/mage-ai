import re
import shlex
from typing import List

# The generic endpoint is for inspecting Git state. Mutations use the structured API.
# Arbitrary subcommands/options can execute programs even without a shell.
READ_OPTIONS = {
    'status': {
        '--short', '-s', '--branch', '-b', '--porcelain', '--porcelain=v1', '--porcelain=v2',
        '--untracked-files=no', '--untracked-files=normal', '--untracked-files=all',
    },
    'log': {
        '--oneline', '--all', '--graph', '--decorate', '--no-decorate', '--date-order',
        '--reverse', '--stat', '--name-only', '--name-status', '--no-color',
    },
    'diff': {
        '--cached', '--staged', '--stat', '--shortstat', '--numstat', '--name-only',
        '--name-status', '--check', '--summary', '--no-color',
    },
    'show': {
        '--oneline', '--stat', '--shortstat', '--numstat', '--name-only', '--name-status',
        '--summary', '--no-patch', '-s', '--no-color',
    },
}


def parse_read_command(command: str) -> List[str]:
    if not isinstance(command, str):
        raise ValueError('Git command must be a string.')
    args = shlex.split(command)
    if args and args[0] == 'git':
        args = args[1:]
    if not args or args[0] not in READ_OPTIONS:
        raise ValueError('Only status, log, diff, and show are supported as generic Git commands.')

    verb, options = args[0], args[1:]
    paths = False
    for option in options:
        if option == '--':
            paths = True
        elif paths or option in READ_OPTIONS[verb]:
            continue
        elif verb == 'log' and re.fullmatch(r'(-[0-9]+|--max-count=[0-9]+)', option):
            continue
        elif verb != 'status' and not option.startswith('-'):
            # Revisions are passed as individual arguments, never shell input.
            continue
        else:
            raise ValueError('Unsupported option for generic Git command.')

    if verb in {'log', 'diff', 'show'}:
        args[1:1] = ['--no-ext-diff', '--no-textconv']
    return args
