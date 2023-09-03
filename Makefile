.PHONY: install-hooks
install-hooks:
	@echo "Copying git hooks from .git-dev/hooks to .git/hooks..."
	@bash scripts/devex/copy_git_hooks.sh .git-dev/hooks .git/hooks

.PHONY: dev_env
dev_env:
	@echo "Generating poetry virtual environment"
	poetry install --no-root --no-interaction
	poetry run pip install -e ./[all,dev]
	poetry run pip install -e ./mage_integrations
	poetry run pre-commit install
