from mage_ai.data_preparation.models.block import PYTHON_COMMAND
from typing import List, Dict
import importlib
import json
import subprocess
import traceback


def get_collection(key: str, available_options: List[Dict]):
    collection = []

    for option in available_options:
        d = option.copy()
        if not d.get('uuid'):
            d['uuid'] = d['name'].lower().replace(' ', '_')
        module_name = d.get('module_name', d['name'].replace(' ', ''))
        uuid = d['uuid']
        try:
            module = importlib.import_module(f"mage_integrations.{key}.{uuid}")
            mod = getattr(module, module_name)
            d['templates'] = mod.templates()
        except FileNotFoundError:
            d['templates'] = {}
        except Exception:
            try:
                absolute_file_path = '/'.join(module.__file__.split('/')[:-2])
                absolute_file_path = f'{absolute_file_path}/{uuid}/__init__.py'
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
                print(f"Failed to load source {d['uuid']}: {err}")
                print(traceback.format_exc())
                continue

        collection.append(d)

    return collection
