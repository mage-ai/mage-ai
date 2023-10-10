import argparse
import json
from typing import Dict

from kubernetes import client, config


def update_kubernetes_config(
    stateful_set_name: str, container_config: Dict, namespace: str
) -> None:
    """
    Updates the Kubernetes configuration.

    Args:
        config (Dict): Kubernetes configuration.
    """

    config.load_incluster_config()
    client.AppsV1Api().patch_namespaced_deployment(
        stateful_set_name,
        namespace=namespace,
        body={
            'spec': {
                'template': {
                    'spec': {
                        'containers': [
                            {
                                'name': f'{stateful_set_name}',
                                **container_config,
                            },
                        ],
                    }
                }
            },
        },
    )
    # client.AppsV1Api().patch_namespaced_stateful_set(
    #     stateful_set_name,
    #     namespace=namespace,
    #     body={
    #         'spec': {
    #             'template': {
    #                 'spec': {
    #                     'containers': [
    #                         {
    #                             'name': f'{stateful_set_name}-container',
    #                             **container_config,
    #                         },
    #                     ],
    #                 }
    #             }
    #         },
    #     },
    # )
    # print('KEWK')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', help='Name of the stateful set')
    parser.add_argument('--config-json', help='JSON string containing container config')
    parser.add_argument('--namespace', help='Namespace of the stateful set')

    args, _ = parser.parse_known_args()

    config_dict = json.loads(args.config_json)
    update_kubernetes_config(args.name, config_dict, args.namespace)
