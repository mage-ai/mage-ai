# Setting up Development Environment

These are the instructions for setting up the development dependencies and conforming to the style guide for the Mage.ai repo.

> [!WARNING]
> _All commands below, without any notes, assume you are at the root of the repo._

## Using helper scripts

To initialise a `mage` repo so you have a starting point:

```bash
./scripts/init.sh default_repo
```

To generate a Docker image, start the dev server for the backend at `localhost:6789` and frontend at `localhost:3000`:

```bash
./scripts/dev.sh default_repo
```

In case you only want the backend:

```bash
./scripts/start.sh default_repo
```

<sup>The name `default_repo` could technically be anything, but bare in mind, if you decide to change it, please also add it to the `.gitignore` file.</sup>

Our mate @mattppal has an [amazing video](https://youtu.be/mxKh2062sTc?si=5GW_mKF5jOpGEO3I) with further guiding and instructions, if that is what you prefer.

## Manual setup

### Mage.ai server

Mage.ai server uses at least Python 3.6 (as per `setup.py`), but the development dependencies will complain if you're not using at least Python 3.8. We [use Python 3.10](./Dockerfile).

As such, make sure you have Python >=3.8. Verify this with:

```bash
python --version
```

Using a virtual environment is recommended.

<details>
  <summary><b>Virtual environment guide</b></summary>
#### Anaconda + Poetry
Create an Anaconda virtual environment with the correct version of python:
```bash
conda create -n python3.10 python==3.10
```

Activate that virtual environment (to get the right version of Python on your PATH):

```bash
conda activate python3.10
```

Verify that the correct Python version is being used:

```bash
python --version
# or
where python
# or
which python
# or
whereis python
```

Then create a Poetry virtual environment using the same version of Python:

```bash
poetry env use $(which python)
```

Install the dev dependencies:

```bash
make dev_env
```

#### Virtualenv

First, create a virtualenv environment in the root of the repo:

```bash
python -m venv .venv
```

Then activate it:

```bash
source .venv/bin/activate
```

</details>

First, install dependencies:

```bash
pip install -r ./requirements.txt
pip install toml mage-ai
```

Install additional dev dependencies from `pyproject.toml`:

```bash
pip install $(python -c "import toml; print(' '.join(toml.load('pyproject.toml')['tool']['poetry']['group']['dev']['dependencies'].keys()))" | tr '\n' ' ')
```

<sup>The above command uses the `toml` library to output the dev dependencies from the `pyproject.toml` as a space-delimited list, and passes that output to the `pip install` command.</sup>

Then, start the dev server:

```bash
python mage_ai/server/server.py
```

<sup>The above command generates a Mage.ai project called `default_repo` by default before starting the server. Please view the file itself for more advanced usages.</sup>

### Mage.ai frontend

> [!IMPORTANT]
> _Even if you are only working on UIs, you would still have to have the server running at port `6789`._

Mage.ai frontend is a Next.js project

```bash
cd mage_ai/frontend/
```

that uses Yarn.

```bash
yarn install && yarn dev
```

# Troubleshoot

In case none of the below help resolve your problem, please feel free to ping us anytime on Slack. We are more than happy to talk.

## Illegal instruction

If an `Illegal instruction` error is received, or Docker containers exit instantly with code 132, it means your machine is using an older architecture that does not support certain instructions called from the (Python) dependencies. Please either try again on another machine, or manually setup the server, start it in verbose mode to see which pakage caused the error, and look up for alternatives.

List of builds:
- `polars` -> [`polars-lts-cpu`](https://pypi.org/project/polars-lts-cpu/)

## `pip install` fails on Windows

Well, we've all been there. Some Python packages take for granted quite a few core functionalities that are not available on Windows, so you need to install their prebuilds, see the fantastic (but archived) [pipwin](https://github.com/lepisma/pipwin) and [this issue](https://github.com/lepisma/pipwin/issues/64) for more options.

# Git Hooks

To install the Git hooks that we use, run the Make command:

```bash
make install-hooks
```

This will copy the git hooks from `.git-dev/hooks` into `.git/hooks`, and make them executable.

# Pre-Commit

To use pre-commit, install the pre-commit hooks:

```bash
pre-commit install
```

Note that this will install both pre-commit and pre-push hooks, as per the configuration in `.pre-commit-config.yaml`.
