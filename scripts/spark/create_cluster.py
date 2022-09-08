import os
import sys

sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))

from mage_ai.services.aws.emr.launcher import create_cluster


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise Exception(
            'Please provide a project path.'
            ' Example: python3 emr_and_cluster.py [project_path]'
        )

    project_path = os.path.abspath(sys.argv[1])
    create_cluster(project_path)
