# 1. Use uv for Python package management

Date: 2026-09-09

Status: Accepted

## Context

Mage AI 0.9.79 spread dependency metadata across three files.

`requirements.txt` held the core runtime packages, followed by a `# extras` block that mixed
optional integrations, cloud SDKs, database drivers, streaming clients, dbt adapters, and the
packages the mage-integrations sources and destinations need at runtime.

`setup.py` read the part of `requirements.txt` above the `# extras` marker into `install_requires`,
then declared a second and independent dependency structure in `extras_require`.

`pyproject.toml` carried a Poetry configuration for dev tooling with metadata that no longer
matched the package. It declared version `0.8.75-dev` and `python = ">=3.8,<4.0"`, while `setup.py`
declared `0.9.79` and `python_requires='>=3.10'`.

Nothing checked the three files against each other, and they had drifted:

- The `all` extra pinned `oracledb==1.3.1` with no marker, while the `oracle` extra pinned
  `oracledb==2.4.1` on Python 3.12 and later.
- The `all` extra pinned `kafka-python==2.0.2`, while `requirements.txt` and the `streaming` extra
  both pinned `2.3.0`.

There was also no lockfile for the runtime. `poetry.lock` covered the dev tooling only, so two
builds of the same commit could install different transitive versions.

CI and the Docker images already called `uv pip install`, so uv was in the toolchain without being
the source of truth for the dependency graph.

## Decision

`pyproject.toml` is the single source of dependency metadata, written in PEP 621 form. uv is the
package manager. `uv.lock` is committed and every environment installs from it.

The layout is:

- `[project.dependencies]` holds the core runtime, carried over unchanged from the core block of
  `requirements.txt`.
- `[project.optional-dependencies]` holds the integrations. It keeps the extras that `setup.py`
  declared and adds `integrations` for the packages the mage-integrations sources and destinations
  need, which previously lived in `requirements.txt` with no extra of their own.
- `[dependency-groups] dev` holds the development tooling that Poetry used to own, plus
  `pytest-xdist`.

`setup.py` and `poetry.lock` are removed. `MANIFEST.in` and the setuptools build backend stay, so
the sdist and the wheel keep the same contents.

The `all` extra now references the other extras instead of repeating their pins. That is what let it
drift on `oracledb` and `kafka-python`, and a reference cannot drift.

`requirements.txt` becomes a generated export of `uv.lock` covering the core runtime plus the `all`
and `integrations` extras, which is the package set the file described before. `make requirements`
regenerates it and CI fails when it is out of date.

`requires-python` becomes `>=3.10,<3.14`. The lower bound matches what `setup.py` declared. The
upper bound matches the versions CI tests, and it keeps uv from resolving for Python 3.14, where
the `typing_extensions==4.11.0` pin has no solution against current grpcio.

The uv version is pinned to 0.11.29 in CI and in the Dockerfile build args.

This change carries no dependency upgrades. Every version that Mage 0.9.79 installed is the version
`uv.lock` resolves, with the two corrections listed above.

## Consequences

Dependency changes go in `pyproject.toml`, followed by `uv lock` and `make requirements`. The three
files travel together in one commit and CI checks that they agree.

`uv sync --locked` gives the same environment on a developer machine, in CI, and in the dev image.
`uv lock --check` is a cheap gate for metadata drift.

The dev images install with `uv sync --locked --inexact`. The `--inexact` flag keeps the packages
that earlier build steps install outside the lockfile, which are sparkmagic, the mage-ai forks of
sqlglot, singer-python and dbt-mysql, faster-fifo, and mage-integrations itself.

pytest is available through the dev group and configured in `pyproject.toml`. It runs the existing
`unittest` suites unchanged. The full-suite CI gate still runs `unittest discover`, because the
SQLite behavior recorded during the GitPython work has to be resolved before one pytest command can
replace it. A pytest step covering the focused git tests runs alongside it.

`sourcery` was dropped from the dev tooling. It publishes no wheel for Linux on arm64, which blocks
`uv sync` on that platform, and its pre-commit hook was already commented out.

The published `mage-ai[all]` set changes in two places. `oracledb` follows the same markers as the
`oracle` extra, so Python 3.12 and later get 2.4.1 instead of a version that predates it.
`kafka-python` becomes 2.3.0, matching the `streaming` extra.

The production `Dockerfile` still installs `mage-ai[all]` from PyPI. Moving it onto the lockfile is
separate work.

## Alternatives considered

**Keep pip and requirements.txt, add a hash-pinned lockfile through pip-compile.** This would give
reproducible installs without changing the toolchain. It leaves `setup.py` and `requirements.txt` as
two places to edit, which is the problem being fixed, and it is slower on the container builds that
already call uv.

**Keep Poetry and extend it to the runtime.** Poetry was already in the repo for dev tooling. Its
metadata had gone stale and unnoticed, the runtime and the dev configuration would still resolve
separately, and CI and the images would need a second package manager alongside uv.

**Make mage_integrations a uv workspace member.** This would put both packages under one resolution
and one lockfile. It also forces the conflicts between them to be settled now, including
`clickhouse_sqlalchemy` and the dbt adapter pins. Those belong to the dependency-conflict work, so
mage_integrations stays a separate install.

**Delete requirements.txt.** Nothing inside the repo reads it after this change. External tooling and
existing deployment scripts do, so it stays as a generated export.
