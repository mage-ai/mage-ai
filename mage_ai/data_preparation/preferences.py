from typing import Dict
from mage_ai.data_preparation.repo_manager import get_repo_path
import os
import traceback
import yaml


class Preferences:
    def __init__(self, repo_path: str = None, config_dict: Dict = None):
        self.repo_path = repo_path or get_repo_path()

        try:
            if not config_dict:
                metadata_path = os.path.join(self.repo_path, '.preferences.yaml')
                if os.path.exists(metadata_path):
                    with open(os.path.join(self.repo_path, '.preferences.yaml')) as f:
                        preferences = yaml.full_load(f.read()) or {}
                else:
                    preferences = dict()
            else:
                preferences = config_dict

            self.sync_config = preferences.get('sync_config', dict())
        except Exception:
            traceback.print_exc()
            pass

    def update_preferences(self, updates: Dict):
        preferences = self.to_dict()
        preferences.update(updates)
        with open(os.path.join(self.repo_path, '.preferences.yaml'), 'w') as f:
            yaml.dump(preferences, f)

    def to_dict(self) -> Dict:
        return dict(
            sync_config=self.sync_config
        )


def get_preferences(repo_path=None) -> Preferences:
    return Preferences(repo_path=repo_path)
