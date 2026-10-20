import argparse
import json
from typing import Dict

from kubernetes import client, config

{{ config_code }}


def update_kubernetes_config(
    stateful_set_name: str, initial_container_config: Dict, namespace: str
) -> None:
    """
    Updates the Kubernetes configuration.

    Args:
        config (Dict): Kubernetes configuration.
    """

    config.load_incluster_config()

    container_config = get_custom_configs(initial_container_config)
    client.AppsV1Api().patch_namespaced_stateful_set(
        stateful_set_name,
        namespace=namespace,
        body={
            'spec': {
                'template': {
                    'spec': {
                        'containers': [
                            {
                                'name': f'{stateful_set_name}-container',
                                **container_config,
                            },
                        ],
                    }
                }
            },
        },
    )


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', help='Name of the stateful set')
    parser.add_argument('--initial-container-config', help='Initial container config')
    parser.add_argument('--namespace', help='Namespace of the stateful set')

    args, _ = parser.parse_known_args()

    initial_container_config = dict()
    with open('/app/initial-config.json', 'r', encoding='utf-8') as f:
        initial_container_config = json.load(f)

    update_kubernetes_config(args.name, initial_container_config, args.namespace)
