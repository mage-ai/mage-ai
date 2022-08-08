import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from mage_ai.services.emr.config import EmrConfig
from mage_ai.services.emr.emr import create_a_new_cluster


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise Exception(
            'Please provide a project path.'
            ' Example: python3 emr_and_cluster.py [project_path]'
        )

    project_path = os.path.abspath(sys.argv[1])
    config_path = os.path.join(project_path, 'metadata.yaml')
    emr_config = EmrConfig(config_path=config_path)
    cluster_id = create_a_new_cluster(
        'mage-data-prepartion',
        [],
        emr_config,
        done_status='WAITING',
        keep_alive=True,
    )
    print(f'Cluster {cluster_id} is created')
