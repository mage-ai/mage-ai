#!/usr/bin/env python3
# fmt: off
# ruff: noqa: E501
"""Sync shared Mintlify docs between mage-pro and mage-ai.

By default, the script copies docs from the current repository's ``docs/``
directory to the sibling peer repository. Use ``--reverse`` to pull changes
from the peer back into the current repo, or pass explicit ``--src`` and
``--dst`` paths for CI.
"""

from __future__ import annotations

import argparse
import filecmp
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DEFAULT_DOCS_DIR_NAME = 'docs'

SYNC_EXTENSIONS = {
    '.gif',
    '.ico',
    '.jpeg',
    '.jpg',
    '.json',
    '.md',
    '.mdx',
    '.png',
    '.svg',
    '.webp',
}

JSON_ALLOWLIST = {'docs.json'}


@dataclass(frozen=True)
class SyncPlan:
    new_files: list[tuple[Path, Path]]
    changed_files: list[tuple[Path, Path]]
    deleted_files: list[Path]
    unchanged_count: int

    @property
    def write_count(self) -> int:
        return len(self.new_files) + len(self.changed_files) + len(self.deleted_files)


def peer_repo_name(repo_name: str) -> str:
    if repo_name.startswith('mage-pro'):
        return 'mage-ai'
    if repo_name.startswith('mage-ai'):
        return 'mage-pro'
    raise ValueError(
        f'Cannot infer peer repo from {repo_name!r}; pass --src and --dst explicitly.',
    )


def default_paths(reverse: bool) -> tuple[Path, Path]:
    current_docs = REPO_ROOT / DEFAULT_DOCS_DIR_NAME
    peer_docs = (
        REPO_ROOT.parent / peer_repo_name(REPO_ROOT.name) / DEFAULT_DOCS_DIR_NAME
    )
    if reverse:
        return peer_docs, current_docs
    return current_docs, peer_docs


def is_syncable_path(path: Path) -> bool:
    if 'node_modules' in path.parts:
        return False
    if path.suffix not in SYNC_EXTENSIONS:
        return False
    if path.suffix == '.json' and path.name not in JSON_ALLOWLIST:
        return False
    return True


def normalize_filter(path: str) -> str:
    return path.removeprefix('docs/').strip('/')


def collect_src_files(
    src: Path, filters: list[str], allow_delete: bool
) -> tuple[list[Path], list[Path]]:
    src_files: list[Path] = []
    deleted_rel_paths: list[Path] = []
    normalized_filters = [
        normalize_filter(path) for path in filters if normalize_filter(path)
    ]

    def add_file(path: Path) -> None:
        if path.is_file() and is_syncable_path(path):
            src_files.append(path)

    if not normalized_filters:
        for path in src.rglob('*'):
            add_file(path)
        return sorted(src_files), deleted_rel_paths

    for filter_path in normalized_filters:
        absolute = src / filter_path
        if absolute.is_dir():
            for path in absolute.rglob('*'):
                add_file(path)
            continue

        if absolute.exists():
            add_file(absolute)
            continue

        rel_path = Path(filter_path)
        if allow_delete and is_syncable_path(rel_path):
            deleted_rel_paths.append(rel_path)

    return sorted(set(src_files)), sorted(set(deleted_rel_paths))


def plan_sync(src: Path, dst: Path, filters: list[str], allow_delete: bool) -> SyncPlan:
    if not src.exists():
        raise FileNotFoundError(f'source directory not found: {src}')
    if not dst.exists():
        raise FileNotFoundError(f'destination directory not found: {dst}')

    src_files, deleted_rel_paths = collect_src_files(src, filters, allow_delete)
    if filters and not src_files and not deleted_rel_paths:
        raise ValueError(f'no matching syncable docs found for: {", ".join(filters)}')

    new_files: list[tuple[Path, Path]] = []
    changed_files: list[tuple[Path, Path]] = []
    deleted_files: list[Path] = []
    unchanged_count = 0

    for src_file in src_files:
        rel_path = src_file.relative_to(src)
        dst_file = dst / rel_path
        if not dst_file.exists():
            new_files.append((src_file, dst_file))
        elif not filecmp.cmp(src_file, dst_file, shallow=False):
            changed_files.append((src_file, dst_file))
        else:
            unchanged_count += 1

    for rel_path in deleted_rel_paths:
        dst_file = dst / rel_path
        if dst_file.exists():
            deleted_files.append(dst_file)

    return SyncPlan(
        new_files=new_files,
        changed_files=changed_files,
        deleted_files=deleted_files,
        unchanged_count=unchanged_count,
    )


def print_plan(
    src: Path, dst: Path, filters: list[str], mode: str, plan: SyncPlan
) -> None:
    print(f'Source : {src}')
    print(f'Dest   : {dst}')
    print(f'Mode   : {mode}')
    if filters:
        print(f'Filter : {", ".join(filters)}')
    print()

    if plan.new_files:
        print(f'New files ({len(plan.new_files)}):')
        for _, dst_file in plan.new_files:
            print(f'  + {dst_file.relative_to(dst)}')
    else:
        print('New files: none')

    print()
    if plan.changed_files:
        print(f'Changed files ({len(plan.changed_files)}):')
        for _, dst_file in plan.changed_files:
            print(f'  ~ {dst_file.relative_to(dst)}')
    else:
        print('Changed files: none')

    print()
    if plan.deleted_files:
        print(f'Deleted files ({len(plan.deleted_files)}):')
        for dst_file in plan.deleted_files:
            print(f'  - {dst_file.relative_to(dst)}')
    else:
        print('Deleted files: none')

    print()
    print(f'Unchanged: {plan.unchanged_count}')


def apply_plan(dst: Path, plan: SyncPlan, verbose: bool) -> None:
    for src_file, dst_file in plan.new_files:
        dst_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_file, dst_file)
        if verbose:
            print(f'  created  {dst_file.relative_to(dst)}')

    for src_file, dst_file in plan.changed_files:
        dst_file.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_file, dst_file)
        if verbose:
            print(f'  updated  {dst_file.relative_to(dst)}')

    for dst_file in plan.deleted_files:
        dst_file.unlink()
        if verbose:
            print(f'  deleted  {dst_file.relative_to(dst)}')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        'paths',
        nargs='*',
        metavar='PATH',
        help='Docs-relative files or directories to sync. Omit to sync every supported docs file.',
    )
    parser.add_argument('--src', type=Path, help='Source docs directory.')
    parser.add_argument('--dst', type=Path, help='Destination docs directory.')
    parser.add_argument(
        '--reverse',
        action='store_true',
        help='Swap the inferred source and destination.',
    )
    parser.add_argument(
        '--apply', action='store_true', help='Write changes. Default is dry run.'
    )
    parser.add_argument(
        '--check',
        action='store_true',
        help='Exit non-zero when the destination is out of sync.',
    )
    parser.add_argument(
        '--delete',
        action='store_true',
        help='Mirror deletions for filtered paths missing from source.',
    )
    parser.add_argument(
        '--verbose', action='store_true', help='Print each file written or deleted.'
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.src or args.dst:
        if not args.src or not args.dst:
            print('ERROR: pass both --src and --dst, or neither.', file=sys.stderr)
            return 2
        src = args.src
        dst = args.dst
        if args.reverse:
            src, dst = dst, src
    else:
        try:
            src, dst = default_paths(args.reverse)
        except ValueError as err:
            print(f'ERROR: {err}', file=sys.stderr)
            return 2

    try:
        plan = plan_sync(src.resolve(), dst.resolve(), args.paths, args.delete)
    except (FileNotFoundError, ValueError) as err:
        print(f'ERROR: {err}', file=sys.stderr)
        return 2

    mode = 'CHECK' if args.check else 'APPLY' if args.apply else 'DRY RUN'
    print_plan(src.resolve(), dst.resolve(), args.paths, mode, plan)

    if args.check and plan.write_count:
        print()
        print(
            'Docs are out of sync. Run this command with --apply to update the destination.'
        )
        return 1

    if args.apply:
        print()
        apply_plan(dst.resolve(), plan, args.verbose)
        print(
            'Done. '
            f'{plan.write_count} file(s) written '
            f'({len(plan.new_files)} new, {len(plan.changed_files)} updated, '
            f'{len(plan.deleted_files)} deleted).',
        )
    elif not args.check:
        print()
        print(
            'Run with --apply to write changes, or --check to fail when changes are needed.'
        )

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
