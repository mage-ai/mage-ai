import importlib
import pkgutil
import sys
from typing import Set

from mage_ai.settings.repo import get_repo_path


def reload_module_and_submodules(module_name: str, reloaded_modules: Set[str]) -> None:
    if module_name in sys.modules and module_name not in reloaded_modules:
        try:
            print(f"Attempting to reload: {module_name}...")  # Indicate reloading attempt
            module = importlib.reload(sys.modules[module_name])
            reloaded_modules.add(module_name)
            print(f"Successfully reloaded: {module_name}")
        except Exception as e:
            print(f"Failed to reload: {module_name}. Error: {e}")

        if hasattr(module, "__path__"):  # If the module is a package, reload its submodules
            print(f"Checking submodules of: {module_name}...")
            for loader, name, is_pkg in pkgutil.walk_packages(module.__path__):
                full_name = module.__name__ + '.' + name
                print(f"Attempting to reload submodule: {full_name}...")
                reload_module_and_submodules(full_name, reloaded_modules)


def reload_all_repo_modules(content: str) -> None:
    print("Starting the module reloading process...")
    repo_path_parts = get_repo_path().split('/')
    project_name = repo_path_parts[-1]
    reloaded_modules = set()

    for line in content.splitlines():
        if f'import {project_name}' in line or f'from {project_name}' in line:
            line_parts = line.replace('import ', '').replace('from ', '').split()
            module_name = line_parts[0]
            reload_module_and_submodules(module_name, reloaded_modules)

    # After all reloading attempts
    print(
        f'Reloading process completed. Total modules/submodules reloaded: {len(reloaded_modules)}',
    )
