import importlib
import json
import subprocess
import traceback
from typing import Dict, List

from mage_ai.data_integrations.utils.settings import get_uuid
from mage_ai.data_preparation.models.constants import PYTHON_COMMAND
from mage_ai.server.logger import Logger

logger = Logger().new_server_logger(__name__)


def build_integration_module_info(key: str, option: Dict) -> Dict:
    d = option.copy()

    module_name = d.get('module_name', d['name'].replace(' ', ''))
    uuid = get_uuid(d)
    d['uuid'] = uuid

    try:
        module = importlib.import_module(f"mage_integrations.{key}.{uuid}")
        absolute_file_path = '/'.join(module.__file__.split('/')[:-2])
        # have the source README available to front-end for inline documentation
        readme_file_path = f'{absolute_file_path}/{uuid}/README.md'
        d['docs'] = f"{uuid} documentation"
        with open(readme_file_path, encoding='utf8') as f:
            d['docs'] = f.read()
        mod = getattr(module, module_name)
        d['templates'] = mod.templates()
    except FileNotFoundError:
        d['templates'] = {}
    except Exception:
        try:
            module = importlib.import_module(f"mage_integrations.{key}.{uuid}")
            absolute_file_path = '/'.join(module.__file__.split('/')[:-2])
            # have the source README available to front-end for inline documentation
            readme_file_path = f'{absolute_file_path}/{uuid}/README.md'
            absolute_file_path = f'{absolute_file_path}/{uuid}/__init__.py'
            d['docs'] = f"{uuid} documentation"
            with open(readme_file_path, encoding='utf8') as f:
                d['docs'] = f.read()
            proc = subprocess.run([
                PYTHON_COMMAND,
                absolute_file_path,
                '--config_json',
                json.dumps({}),
                '--show_templates',
            ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
            for line in proc.stdout.decode().split('\n'):
                try:
                    d['templates'] = json.loads(line)
                except Exception:
                    pass
        except Exception as err:
            logger.error(f"Failed to load source {d['uuid']}: {err}")
            logger.error(traceback.format_exc())

            return

    return d


def get_collection(key: str, available_options: List[Dict]):
    collection = []

    for option in available_options:
        d = build_integration_module_info(key, option)
        if d:
            collection.append(d)

    return collection
