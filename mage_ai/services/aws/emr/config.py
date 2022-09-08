from dataclasses import dataclass
from mage_ai.shared.config import BaseConfig
from typing import Dict

DEFAULT_DRIVER_MEMORY = '32000M'
DEFAULT_INSTANCE_TYPE = 'r5.4xlarge'
INSTANCE_DRIVER_MEMORY_MAPPING = {
    'r5.2xlarge': '16000M',
    'r5.xlarge': '8000M',
}


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
                                'spark.driver.memory': self.__driver_memory(
                                    self.master_instance_type,
                                ),
                                'spark.driver.maxResultSize': '0',
                                'spark.executor.memory': self.__driver_memory(
                                    self.master_instance_type,
                                ),
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
                                'spark.driver.memory': self.__driver_memory(
                                    self.slave_instance_type,
                                ),
                                'spark.driver.maxResultSize': '0',
                                'spark.executor.memory': self.__driver_memory(
                                    self.slave_instance_type,
                                ),
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

    def __driver_memory(self, instance_size: str) -> str:
        return INSTANCE_DRIVER_MEMORY_MAPPING.get(instance_size, DEFAULT_DRIVER_MEMORY)
