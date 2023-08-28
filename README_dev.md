# Setting up Development Environment

These are the instructions for setting up the development dependencies and conforming to the style guide for the Mage.ai repo.

## Installation of Development Tools

### macOS

#### Install Anaconda

Follow the instructions given in [Installing on macOS](https://docs.anaconda.com/free/anaconda/install/mac-os/) to install `anaconda` on Mac.

To verify the installation, enter the following command in a terminal:
```
% conda list
```
If Anaconda is installed and working, this will display a list of installed packages and their versions.

#### Install Poetry

In a terminal, run the following command:
```bash
% curl -sSL https://install.python-poetry.org | python3 -
```

Add `export PATH=$HOME/.local/bin:$PATH` to your shell configuration file.

To check the Peotry installation, run
```bash
$ poetry --version
```

#### Install Pre-commit

To manage and run git hooks, you need to have the `pre-commit` package manager installed, in multiple ways:

Using pip:
```
% pip install pre-commit
```

Using homebrew:
```
% brew install pre-commit
```

Using conda (via conda-forge):
```
% conda install -c conda-forge pre-commit
```

### Windows

#### Install Anaconda

Go to [Anaconda Releases](https://repo.continuum.io/archive) to find the release you want, e.g., `Anaconda3-2023.03-1-Linux-x86_64.sh`.

From a WSL terminal, run:
```bash
$ wget https://repo.continuum.io/archive/Anaconda3-2023.03-1-Linux-x86_64.sh
$ bash Anaconda3-2023.03-1-Linux-x86_64.sh
```
Close the terminal and reopen it to reload `.bash` configs. To test that it worked, run
```bash
$ which python
```
It should print a path that has an "anaconda" in it.

#### Install Poetry
In a WSL terminal, run
```bash
$ curl -sSL https://install.python-poetry.org | python3 -
```

Add `%APPDATA%\Python\Scripts` to the Windows PATH system variable.

To check the Peotry installation, run
```bash
$ poetry --version
```

#### Install Pip and Pre-commit in WSL

To install `pip` and `pre-commit`, run the following commands in a WSL terminal
```bash
$ sudo apt-get update
$ sudo apt install python3-pip
$ sudo apt install pre-commit
```

## Virtual Environment
The Mage.ai uses at least Python 3.6 (as per `setup.py`), but the development dependencies will complain if you're not using at least Python 3.8.

As such, make sure you have Python 3.8 on your PATH. Verify this with:
```bash
python --version
```

### Anaconda + Poetry
***
One way to do this is to use Anaconda + poetry.

Create an Anaconda virtual environment with the correct version of python:
```bash
conda create -n python3.10 python==3.10
```

Activate that virtual environment (to get the right version of Python on your PATH):
```bash
conda activate python3.10
```

Verify that the correct Python is being used:
```bash
python --version
# or
where python
# or
which python
# or
whereis python
```

Then create a poetry virtual environment using that version of Python:
```bash
poetry env use $(which python)
```

Then install the dev dependencies:
```bash
make dev_env
```

### Virtualenv
***
To use virtualenv to set up the project, first you need to create a virtualenv environment folder in the root of the repo:
```bash
python -m venv .venv
```

Then activate it:
```bash
source .venv/bin/activate
```

To install the dependencies from any of the requirements.txt files in the repo, run:
```bash
pip install -r <path/to/requirements.txt>
```

Then, to install the dev-dependencies from the `pyproject.toml` file, run:
```bash
pip install $(python -c "import toml; print(' '.join(toml.load('pyproject.toml')['tool']['poetry']['group']['dev']['dependencies'].keys()))" | tr '\n' ' ')
```

This command just uses Python and the `toml` library to output the dev dependencies from the `pyproject.toml` as a space-delimited list, and passes that output to the `pip install` command.
## Git Hooks

To install the Git hooks that we use, run the Make command:
```bash
make install-hooks
```

This will copy the git hooks from `.git-dev/hooks` into `.git/hooks`, and make them executable.

## Pre-Commit

To use pre-commit, install the pre-commit hooks:
```bash
pre-commit install
```

Note that this will install both pre-commit and pre-push hooks, as per the configuration in `.pre-commit-config.yaml`.
