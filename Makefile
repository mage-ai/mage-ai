install-hooks:
	@echo "Copying git hooks from .git-dev/hooks to .git/hooks..."
	@bash scripts/devex/copy_git_hooks.sh .git-dev/hooks .git/hooks

dev_env:
	@echo "Generating poetry virtual environment"
	poetry install --no-root

.PHONY: install-hooks dev_env
