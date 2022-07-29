from typing import Dict
import os
import yaml

DEFAULT_INSTANCE_TYPE = 'r5.4xlarge'
MAX_CLUSTERS_ON_SPOT_INSTANCES = 40


class EmrConfig:
    def __init__(self, config_path: str = None, config: Dict = None):
        if config is None:
            self.config_path = config_path
            if self.config_path is None:
                raise Exception(
                    'Please provide a config_path or a config dictionary to initialize'
                    ' an EmrConfig object',
                )
            if not os.path.exists(self.config_path):
                raise Exception(f'EMR config {self.config_path} does not exist.')
            with open(self.config_path) as fp:
                config = yaml.full_load(fp) or {}

        if 'emr_config' in config:
            config = config['emr_config']
        self.config = config
        self.master_security_group = config.get('master_security_group')
        if self.master_security_group is None:
            raise Exception(
                'Please provide master_security_group in config file to initialize an EmrConfig',
            )
        self.slave_security_group = \
            config.get('slave_security_group') or self.master_security_group
        self.master_instance_type = config.get('master_instance_type', DEFAULT_INSTANCE_TYPE)
        self.slave_instance_type = config.get('slave_instance_type', DEFAULT_INSTANCE_TYPE)

    def get_instances_config(self, cluster_count, idle_timeout=0):
        market = 'SPOT' if cluster_count < MAX_CLUSTERS_ON_SPOT_INSTANCES else 'ON_DEMAND'
        instances_config = {
            'KeepJobFlowAliveWhenNoSteps': False,
            'EmrManagedMasterSecurityGroup': self.master_security_group,
            'EmrManagedSlaveSecurityGroup': self.slave_security_group,
            'InstanceGroups': [
                dict(
                    Name='AmazonEMRMaster',
                    Market=market,
                    InstanceRole='MASTER',
                    InstanceType=self.master_instance_type,
                    InstanceCount=1,
                    Configurations=[
                        {
                            'Classification': 'spark-defaults',
                            'Properties': {
                                'spark.driver.memory': '32000M',
                                'spark.driver.maxResultSize': '0',
                                'spark.executor.memory': '32000M',
                            },
                        },
                    ],
                ),
                dict(
                    Name='AmazonEMRCore',
                    Market=market,
                    InstanceRole='CORE',
                    InstanceType=self.slave_instance_type,
                    InstanceCount=1,
                    Configurations=[
                        {
                            'Classification': 'spark-defaults',
                            'Properties': {
                                'spark.driver.memory': '32000M',
                                'spark.driver.maxResultSize': '0',
                                'spark.executor.memory': '32000M',
                            },
                        },
                    ],
                ),
            ],
        }
        return instances_config
