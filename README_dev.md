# Setting up a Development Environment

We'd love to have your contribution, but first you'll need to configure your local environment first. In this guide, we'll walk through:

1. Installing uv
2. Installing dependencies
3. Installing Git hooks
4. Installing pre-commit hooks
5. Building the Mage Docker image
6. Running dev!

> [!WARNING]
> _All commands below, without any notes, assume you are at the root of the repo._

Mage server requires Python `>=3.10,<3.14`, as declared in `pyproject.toml`. The Docker images [use Python 3.10](./Dockerfile).

Python dependencies are managed with [uv](https://docs.astral.sh/uv/). `pyproject.toml` declares them and `uv.lock` pins the resolved versions. Both files are committed.

Install uv:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Then clone the repo:

```bash
git clone https://github.com/mage-ai/mage-ai mage-ai
cd mage-ai
```

uv downloads a matching Python interpreter on its own, so there is no need to set one up beforehand.

## Installing dependencies

Create the environment with the core runtime and the dev tooling:

```bash
make dev_env
```

That runs `uv sync --locked --group dev`. It creates `.venv` in the repo root and installs the versions recorded in `uv.lock`.

To install every optional integration as well (dbt, cloud SDKs, streaming clients, database drivers):

```bash
make dev_env_all
```

Run commands against the environment with `uv run`:

```bash
uv run python mage_ai/server/server.py
uv run pytest mage_ai/tests/data_preparation/git -v
```

You can also activate `.venv` and use it like any other virtual environment:

```bash
source .venv/bin/activate
```

### Extras

The optional dependency groups in `pyproject.toml` map to the integrations Mage supports. Install the ones you need:

```bash
uv sync --locked --extra postgres --extra dbt --group dev
```

Two extras cover larger sets. `all` is what the published container image installs. `integrations` covers the packages the mage-integrations sources and destinations need at runtime.

### Adding or changing a dependency

Edit `pyproject.toml`, then refresh the lockfile and the requirements export:

```bash
uv lock
make requirements
```

Commit `pyproject.toml`, `uv.lock`, and `requirements.txt` in the same change. CI fails when the three disagree.

`requirements.txt` is generated from `uv.lock` and kept for tooling that still expects a pip requirements file. Edit `pyproject.toml` instead of editing it directly.

### Running the tests

pytest is the test runner for local development. It executes the existing `unittest` suites without any changes to them:

```bash
make test
uv run pytest mage_ai/tests/data_preparation/git -v
uv run pytest --cov=mage_ai --cov-report=term-missing
```

## Mage frontend

If you'll only be contributing to backend code, this section may be omitted.

> [!IMPORTANT]
> _Even if you are only working on UIs, you would still have to have the server running at port `6789`._

The Mage frontend is a Next.js project

```bash
cd mage_ai/frontend/
```

that uses Yarn.

```bash
yarn install && yarn dev
```

## Git Hooks

Install Git hooks by running the Make command:

```bash
make install-hooks
```

This will copy the git hooks from `.git-dev/hooks` into `.git/hooks`, and make them executable.

## Pre-Commit

Install the pre-commit hooks:

```bash
uv run pre-commit install
```

Note that this will install both pre-commit and pre-push hooks.

## Run development server

To initialize a development mage project so you have a starting point:

```bash
./scripts/init.sh default_repo
```

Then, to start the dev server for the backend at `localhost:6789` and frontend at `localhost:3000`:

```bash
./scripts/dev.sh default_repo
```

In case you only want the backend:

```bash
./scripts/start.sh default_repo
```

The name `default_repo` could technically be anything, but if you decide to change it, be sure to add it to the `.gitignore` file. You're now ready to contribute!

See this [video](https://youtu.be/mxKh2062sTc?si=5GW_mKF5jOpGEO3I) for further guidance and instructions.

Any time you'd like to build, just run `./scripts/dev.sh default_repo` to run the development containers.

Any changes you make, backend or frontend, will be reflected in the development instance.

Our pre-commit & pre-push hooks will run when you make a commit/push to check style, etc.

Now it's time to create a new branch, contribute code, and open a pull request!

## Troubleshoot

Here are some common problems our users have encountered. If other issues arise, please reach out to us in Slack!

### Illegal instruction

If an `Illegal instruction` error is received, or Docker containers exit instantly with `code 132`, it means your machine is using an older architecture that does not support certain instructions called from the (Python) dependencies. Please either try again on another machine, or manually setup the server, start it in verbose mode to see which package caused the error, and look up for alternatives.

List of builds:
- `polars` -> [`polars-lts-cpu`](https://pypi.org/project/polars-lts-cpu/)

### Installing packages fails on Windows

Some Python packages assume a few core functionalities that are not available on Windows, so you need to install these prerequisites, see the fantastic (but archived) [pipwin](https://github.com/lepisma/pipwin) and [this issue](https://github.com/lepisma/pipwin/issues/64) for more options.

Please report any other build errors in our Slack.

### ModuleNotFoundError: No module named 'x'

If there were added new libraries you should manually handle new dependencies. It can be done in 2 ways:

1. `docker-compose build` from project root will fully rebuild an image with new dependencies - it can take lots of time
2. `uv pip install x` from inside the container will only install the required dependency - it should be much faster

## Monaco Editor features

If you want to exclude a feature from the WebPack build,
you can do so by modifying the WebPack configuration:

```js
config.plugins.push(
  new MonacoWebpackPlugin({
    features: ['!anchorSelect'],
  }),
);
```

### Features

Get list of features:

```tsx
import metadata from 'monaco-editor/esm/metadata';
console.log(metadata.features);
```

```
anchorSelect
bracketMatching
browser
caretOperations
clipboard
codeAction
codeEditor
codelens
colorPicker
comment
contextmenu
cursorUndo
diffEditor
diffEditorBreadcrumbs
dnd
documentSymbols
dropOrPasteInto
find
folding
fontZoom
format
gotoError
gotoLine
gotoSymbol
hover
iPadShowKeyboard
inPlaceReplace
indentation
inlayHints
inlineCompletions
inlineEdit
inlineProgress
inspectTokens
lineSelection
linesOperations
linkedEditing
links
longLinesHelper
multicursor
parameterHints
quickCommand
quickHelp
quickOutline
readOnlyMessage
referenceSearch
rename
sectionHeaders
semanticTokens
smartSelect
snippet
stickyScroll
suggest
toggleHighContrast
toggleTabFocusMode
tokenization
unicodeHighlighter
unusualLineTerminators
wordHighlighter
wordOperations
wordPartOperations
```
