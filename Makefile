install-hooks:
	@echo "Copying git hooks from .git-dev/hooks to .git/hooks..."
	@bash scripts/devex/copy_git_hooks.sh .git-dev/hooks .git/hooks

dev_env:
	@echo "Generating poetry virtual environment"
	poetry install --no-root

publish_private_pip:
	@bash scripts/publish_private_pip.sh

.PHONY: install-hooks dev_env publish_private_pip
