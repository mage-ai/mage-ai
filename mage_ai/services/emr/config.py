from dataclasses import dataclass
from mage_ai.services.config import BaseConfig
from typing import Dict

DEFAULT_INSTANCE_TYPE = 'r5.4xlarge'
# MAX_CLUSTERS_ON_SPOT_INSTANCES = 40


@dataclass
class EmrConfig(BaseConfig):
    ec2_key_name: str = None
    master_security_group: str = None
    slave_security_group: str = None
    master_instance_type: str = DEFAULT_INSTANCE_TYPE
    slave_instance_type: str = DEFAULT_INSTANCE_TYPE

    def get_instances_config(
        self,
        cluster_count: int,
        idle_timeout: int = 0,
        keep_alive: bool = False
    ) -> Dict:
        market = 'ON_DEMAND'
        instances_config = {
            'KeepJobFlowAliveWhenNoSteps': keep_alive,
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
        if self.ec2_key_name is not None:
            instances_config['Ec2KeyName'] = self.ec2_key_name
        if self.master_security_group is not None:
            instances_config['EmrManagedMasterSecurityGroup'] = self.master_security_group
        if self.slave_security_group is not None:
            instances_config['EmrManagedSlaveSecurityGroup'] = self.slave_security_group
        return instances_config
