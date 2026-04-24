# Contributing to Mage AI

Thank you for considering contributing to Mage. Whether you're fixing a typo, squashing a bug, adding a feature, or improving documentation, every contribution makes Mage better for the entire community.

This guide covers everything you need to get started. If anything is unclear, reach out on [Slack](https://www.mage.ai/chat) and we'll help you out.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Your First Code Contribution](#your-first-code-contribution)
  - [Improving Documentation](#improving-documentation)
  - [Community Support](#community-support)
- [Development Setup](#development-setup)
  - [Prerequisites](#prerequisites)
  - [Quick Start with Docker](#quick-start-with-docker)
  - [Local Environment (Without Docker)](#local-environment-without-docker)
  - [Frontend Development](#frontend-development)
  - [Git Hooks & Pre-commit](#git-hooks--pre-commit)
  - [Running the Dev Server](#running-the-dev-server)
- [Making Your Contribution](#making-your-contribution)
  - [Branching Strategy](#branching-strategy)
  - [Commit Messages](#commit-messages)
  - [Pull Request Process](#pull-request-process)
  - [PR Checklist](#pr-checklist)
  - [Code Review](#code-review)
- [Style Guides](#style-guides)
  - [Python (Backend)](#python-backend)
  - [TypeScript (Frontend)](#typescript-frontend)
- [Testing](#testing)
  - [Backend Tests](#backend-tests)
  - [Frontend Tests](#frontend-tests)
- [Project Structure](#project-structure)
- [Community & Support](#community--support)
- [Recognition](#recognition)
- [License](#license)

---

## Code of Conduct

This project is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to **hello@mage.ai**.

---

## How Can I Contribute?

### Reporting Bugs

Found something broken? Here's how to report it:

1. **Search existing issues** — Check [GitHub Issues](https://github.com/mage-ai/mage-ai/issues) to see if it's already been reported.
2. **File a new issue** — Use our [Bug Report template](https://github.com/mage-ai/mage-ai/issues/new?template=bug_report.yml) with:
   - Your Mage version
   - Steps to reproduce
   - Expected vs. actual behavior
   - Screenshots or logs (if applicable)
3. **Report on Slack** — For quick help, post in the [`#bugs-troubleshoot-questions`](https://www.mage.ai/chat) channel.

### Suggesting Features

Have an idea to make Mage better?

1. **Check our roadmap** — See if it's already planned on the [Mage Roadmap](https://airtable.com/shrJctaGt4tvU27uF/tbl5bIlFkk2KhCpL4).
2. **Search existing issues** — Someone might have already suggested it.
3. **Open a feature request** — Use our [Feature Request template](https://github.com/mage-ai/mage-ai/issues/new?template=feature_request.md).
4. **Discuss on Slack** — Drop your idea in the [`#feature-requests`](https://www.mage.ai/chat) channel.

### Your First Code Contribution

Not sure where to start? Look for these labels on the issue tracker:

- **[Good First Issues](https://github.com/mage-ai/mage-ai/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)** — Beginner-friendly tasks, scoped and well-defined.
- **[Help Wanted](https://github.com/mage-ai/mage-ai/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)** — Issues where community help is especially welcome.

### Improving Documentation

Docs live in the [`docs/`](docs/) directory and are published to [docs.mage.ai](https://docs.mage.ai). You can contribute by:

- Fixing typos or clarifying existing instructions
- Adding examples or improving explanations
- Scrolling to the bottom of any page on [docs.mage.ai](https://docs.mage.ai) and clicking **"Edit this page"** to submit a quick fix directly from your browser

### Community Support

Already familiar with Mage? Help others in the community:

- Answer questions on [Slack](https://www.mage.ai/chat) in `#bugs-troubleshoot-questions` and `#general`
- Triage and respond to [GitHub Issues](https://github.com/mage-ai/mage-ai/issues)

---

## Development Setup

> For the full, detailed setup walkthrough, see [`README_dev.md`](README_dev.md). What follows is a quick-start summary.

### Prerequisites

| Tool | Version | Notes |
| :--- | :--- | :--- |
| Python | ≥ 3.8 (recommended: 3.10) | Backend server |
| Node.js | 18.18.0 | Frontend (only if working on UI) |
| Yarn | latest | Frontend package manager |
| Docker | latest | Recommended for dev environment |

### Quick Start with Docker

The fastest way to get a working dev environment:

```bash
# 1. Clone and enter the repo
git clone https://github.com/mage-ai/mage-ai.git
cd mage-ai

# 2. Initialize a dev project
./scripts/init.sh default_repo

# 3. Build and run (backend + frontend)
./scripts/dev.sh default_repo
```

The backend will be available at `http://localhost:6789` and the frontend at `http://localhost:3000`.

### Local Environment (Without Docker)

**Option A: Anaconda + Poetry**

```bash
conda create -n python3.10 python==3.10
conda activate python3.10
poetry env use $(which python)
make dev_env
```

**Option B: virtualenv**

```bash
python -m venv .venv
source .venv/bin/activate
pip install -U pip
pip install -r ./requirements.txt
pip install toml mage-ai
```

### Frontend Development

> **Note:** Even if you are only working on the UI, you still need the backend server running on port `6789`.

```bash
cd mage_ai/frontend/
yarn install && yarn dev
```

The frontend uses **React**, **Next.js**, and **TypeScript**. Code lives in [`mage_ai/frontend/`](mage_ai/frontend/).

### Git Hooks & Pre-commit

```bash
# Install custom git hooks
make install-hooks

# Install pre-commit hooks (includes pre-commit and pre-push)
pre-commit install
```

The pre-commit hooks enforce:
- **Trailing whitespace** removal
- **End-of-file** fixing
- **YAML/JSON** validation
- **`isort`** for Python import ordering
- **`flake8`** for Python linting (max line length: 100)

### Running the Dev Server

```bash
# Backend + Frontend (Docker)
./scripts/dev.sh default_repo

# Backend only (better performance, Docker)
./scripts/start.sh default_repo
```

> **Video walkthrough**: [Setting up a Mage dev environment](https://youtu.be/mxKh2062sTc)

---

## Making Your Contribution

### Branching Strategy

```
1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a feature branch from `master`
4. Make your changes
5. Push to your fork
6. Open a Pull Request against `mage-ai/mage-ai:master`
```

```bash
# Example workflow
git clone https://github.com/<your-username>/mage-ai.git
cd mage-ai
git checkout -b feat/my-awesome-feature
# ... make changes ...
git add .
git commit -m "feat: add awesome feature"
git push origin feat/my-awesome-feature
```

### Commit Messages

We recommend writing clear, descriptive commit messages. A common convention:

| Prefix | Use Case |
| :--- | :--- |
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `docs:` | Documentation changes only |
| `style:` | Formatting, missing semicolons, etc. (no logic change) |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `test:` | Adding or updating tests |
| `chore:` | Build process, CI, or tooling changes |

### Pull Request Process

1. **Fill out the PR template** — Describe your changes, motivation, and how it was tested.
2. **Link related issues** — Reference any related GitHub issues (e.g., `Closes #1234`).
3. **Keep PRs focused** — One feature or fix per PR. Smaller PRs are reviewed faster.
4. **Ensure CI passes** — Our GitHub Actions will run linting and tests automatically.
5. **Request a review** — Tag one of the following maintainers:
   - `@wangxiaoyou1993` — Backend / IO
   - `@johnson-mage` — Frontend / Docs / Website
   - `@tommydangerous` — General

### PR Checklist

Before submitting, please confirm:

- [ ] The PR is tagged with proper labels (`bug`, `enhancement`, `feature`, `documentation`)
- [ ] I have performed a self-review of my own code
- [ ] I have added unit tests that prove my fix is effective or that my feature works
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation

### Code Review

- A maintainer will review your PR, typically within a few days.
- Reviews may request changes — this is normal and part of the collaborative process.
- Once approved, a maintainer will merge your PR.

---

## Style Guides

### Python (Backend)

- **Linter**: `flake8` (max line length: `100`)
- **Import sorting**: `isort`
- **Config**: See [`.flake8`](.flake8) for the full configuration

```bash
# Run the backend linter locally
./scripts/server/lint.sh
```

### TypeScript (Frontend)

- **Style guide**: [Airbnb JavaScript Style Guide](https://airbnb.io/javascript/react/)
- **Linter**: ESLint (with `eslint-config-next`)

```bash
# Run the frontend linter locally
./scripts/test.sh
```

---

## Testing

### Backend Tests

```bash
# Run all backend unit tests
python3 -m unittest discover -s mage_ai --failfast

# Or via the provided script
./scripts/server/test.sh
```

**Running tests inside Docker:**

```bash
# Find the backend container name
docker container ls

# Enter the container
docker exec -it mage-ai-server-1 /bin/bash

# Run tests
python3 -m unittest discover -s mage_ai.tests --failfast
```

Tests live in the [`mage_ai/tests/`](mage_ai/tests/) directory.

### Frontend Tests

Frontend tests use [Playwright](https://playwright.dev/).

```bash
cd mage_ai/frontend/

# Run all tests (headless)
yarn test

# Run all tests (with browser)
yarn test:h

# Run specific tests
yarn test pipelines

# Run with CI configuration
yarn test:ci
```

> For detailed testing guides, see [Frontend Testing](https://docs.mage.ai/contributing/frontend/testing) and [Backend Testing](https://docs.mage.ai/contributing/backend/overview).

---

## Project Structure

A brief overview of the repository layout:

```
mage-ai/
├── mage_ai/                  # Core Python package
│   ├── frontend/             # Next.js frontend application
│   ├── tests/                # Backend unit tests
│   └── ...
├── mage_integrations/        # Data integration connectors (Singer-based)
├── docs/                     # Documentation source (published to docs.mage.ai)
│   └── contributing/         # Detailed contribution guides
├── scripts/                  # Dev, build, and CI scripts
├── .github/                  # Issue templates, PR template, CI workflows
├── README.md                 # Project overview
├── README_dev.md             # Full development environment setup guide
├── CONTRIBUTING.md           # ← You are here
├── CODE_OF_CONDUCT.md        # Community standards
├── SECURITY.md               # Security vulnerability reporting
└── LICENSE                   # Apache License 2.0
```

---

## Community & Support

Join us on any of these platforms:

| Platform | Link |
| :--- | :--- |
| **Slack** | [mage.ai/chat](https://www.mage.ai/chat) |
| **LinkedIn** | [Mage Technologies](https://www.linkedin.com/company/magetech) |
| **Twitter / X** | [@mage_ai](https://twitter.com/mage_ai) |
| **Blog** | [mage.ai/blog](https://www.mage.ai/blog) |
| **GitHub** | [mage-ai/mage-ai](https://github.com/mage-ai/mage-ai) |
| **Email** | [hello@mage.ai](mailto:hello@mage.ai) |

---

## Recognition

Every contributor matters. Anything you contribute, the Mage team and community will maintain. We're in it together.

---

## License

By contributing to Mage, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).
