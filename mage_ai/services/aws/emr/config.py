import os
from dataclasses import dataclass, field
from typing import Dict, List

from mage_ai.shared.config import BaseConfig
from mage_ai.shared.hash import merge_dict

DEFAULT_DRIVER_MEMORY = '32000M'
DEFAULT_INSTANCE_TYPE = 'r5.4xlarge'
INSTANCE_DRIVER_MEMORY_MAPPING = {
    'r5.2xlarge': '16000M',
    'r5.xlarge': '8000M',
}


@dataclass
class EmrScalingPocliy(BaseConfig):
    unit_type: str = 'Instances'    # 'InstanceFleetUnits'|'Instances'|'VCPU'
    minimum_capacity_units: int = 1
    maximum_capacity_units: int = 2
    maximum_on_demand_capacity_units: int = 2
    maximum_core_capacity_units: int = 2


@dataclass
class EmrConfig(BaseConfig):
    bootstrap_script_path: str = None
    ec2_key_name: str = None
    ec2_key_path: str = None
    master_security_group: str = None
    slave_security_group: str = None
    master_instance_type: str = DEFAULT_INSTANCE_TYPE
    master_spark_properties: Dict = field(default_factory=dict)
    slave_instance_count: int = 1
    slave_instance_type: str = DEFAULT_INSTANCE_TYPE
    slave_spark_properties: Dict = field(default_factory=dict)
    scaling_policy: EmrScalingPocliy = None
    spark_jars: List = field(default_factory=list)

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
                            'Properties': merge_dict({
                                'spark.driver.memory': self.__driver_memory(
                                    self.master_instance_type,
                                ),
                                'spark.driver.maxResultSize': '0',
                                'spark.executor.memory': self.__driver_memory(
                                    self.master_instance_type,
                                ),
                            }, self.master_spark_properties),
                        },
                    ],
                ),
                dict(
                    Name='AmazonEMRCore',
                    Market=market,
                    InstanceRole='CORE',
                    InstanceType=self.slave_instance_type,
                    InstanceCount=self.slave_instance_count,
                    Configurations=[
                        {
                            'Classification': 'spark-defaults',
                            'Properties': merge_dict({
                                'spark.driver.memory': self.__driver_memory(
                                    self.slave_instance_type,
                                ),
                                'spark.driver.maxResultSize': '0',
                                'spark.executor.memory': self.__driver_memory(
                                    self.slave_instance_type,
                                ),
                            }, self.slave_spark_properties),
                        },
                    ],
                ),
            ],
        }
        if os.getenv('MAGE_EC2_SUBNET_ID'):
            instances_config['Ec2SubnetId'] = os.getenv('MAGE_EC2_SUBNET_ID')
        if self.ec2_key_name is not None:
            instances_config['Ec2KeyName'] = self.ec2_key_name
        if self.master_security_group is not None:
            instances_config['EmrManagedMasterSecurityGroup'] = self.master_security_group
        if self.slave_security_group is not None:
            instances_config['EmrManagedSlaveSecurityGroup'] = self.slave_security_group
        return instances_config

    def get_managed_scaling_policy(self):
        if self.scaling_policy is not None:
            return {
                'ComputeLimits': {
                    'UnitType': self.scaling_policy.unit_type,
                    'MinimumCapacityUnits': self.scaling_policy.minimum_capacity_units,
                    'MaximumCapacityUnits': self.scaling_policy.maximum_capacity_units,
                    'MaximumOnDemandCapacityUnits':
                        self.scaling_policy.maximum_on_demand_capacity_units,
                    'MaximumCoreCapacityUnits': self.scaling_policy.maximum_core_capacity_units,
                },
            }
        return None

    def __driver_memory(self, instance_size: str) -> str:
        return INSTANCE_DRIVER_MEMORY_MAPPING.get(instance_size, DEFAULT_DRIVER_MEMORY)
