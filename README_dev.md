# Setting up a Development Environment

We'd love to have your contribution, but first you'll need to configure your local environment first!


These are the steps:

1. Build Mage image (requires Docker)
2. Configure virtual environment
3. Install Git hooks
4. Install pre-commit hooks
5. Run dev instance!

First, if you haven't already, clone the repo and navigate to the folder:

```bash
git clone https://github.com/mage-ai/mage-ai mage-ai
cd mage-ai
```

Next, we'll configure our virtual environment.

## Virtual Environment

Mage requires >= Python 3.8. We recommend using `virtualenv` for your new development environment. You can read about how to install and use `virtualenv` [here](https://www.dataquest.io/blog/a-complete-guide-to-python-virtual-environments/).

### Option 1: Virtualenv

Make sure you're in your development repo— `cd mage-ai` and create a new environment:

```bash
pyenv virutalenv 3.10.0 mage-dev
```

Now, make that environment the local default:

```
pyenv local mage-dev
```

To install the dev-dependencies from the `pyproject.toml` file, run:

```bash
pip install -U pip
pip install toml
pip install $(python -c "import toml; print(' '.join(toml.load('pyproject.toml')['tool']['poetry']['group']['dev']['dependencies'].keys()))" | tr '\n' ' ')
```

This command just uses Python and the `toml` library to output the dev dependencies from the `pyproject.toml` as a space-delimited list, and passes that output to the `pip install` command.

### Option 2: Anaconda + Poetry

You may also use Anaconda + Poetry for your dev environment.

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

## Run development server

Run the `init` script to build the requisite images, where `default_repo` will be the name of your development project (`default_repo` is what we use, but if you choose a different name, be sure to add it to `.gitignore`):

```bash
./scripts/init.sh default_repo
```

You're now ready to contribute!

Run `./scripts/dev.sh default_repo` to run the development Docker container. Any changes you make, backend or frontend, will be reflected in this development instance.

Our pre-commit & pre-push hooks will run when you make a contribution to check style, etc.

Now it's time to create a new branch, contribute code, and open a pull request!