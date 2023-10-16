from dataclasses import dataclass, field
from typing import List

from mage_ai.services.spark.models.base import BaseSparkModel


@dataclass
class Resource(BaseSparkModel):
    amount: int = None  # 0
    discovery_script: str = None  # ""
    resource_name: str = None  # "cores", "cpus", "memory", "offHeap"
    vendor: str = None  # ""


@dataclass
class ExecutorResources(BaseSparkModel):
    cores: Resource = None
    memory: Resource = None
    off_heap: Resource = None

    def __post_init__(self):
        if self.cores:
            self.cores = Resource.load(**self.cores)
        if self.memory:
            self.memory = Resource.load(**self.memory)
        if self.off_heap:
            self.off_heap = Resource.load(**self.off_heap)


@dataclass
class TaskResources(BaseSparkModel):
    cpus: Resource = None

    def __post_init__(self):
        if self.cpus:
            self.cpus = Resource.load(**self.cpus)


@dataclass
class ResourceProfiles(BaseSparkModel):
    executor_resources: ExecutorResources = None
    id: int = None  # 0
    task_resources: TaskResources = None

    def __post_init__(self):
        if self.executor_resources:
            self.executor_resources = ExecutorResources.load(**self.executor_resources)
        if self.task_resources:
            self.task_resources = TaskResources.load(**self.task_resources)


@dataclass
class Runtime(BaseSparkModel):
    java_home: str = None  # "/usr/lib/jvm/java-11-openjdk-arm64"
    java_version: str = None  # "11.0.20 (Debian)"
    scala_version: str = None  # "version 2.12.18"


@dataclass
class Environment(BaseSparkModel):
    """
    [
      "/usr/local/lib/python3.10/site-packages/pyspark/conf",
      "System Classpath"
    ],
    [
      "/usr/local/lib/python3.10/site-packages/pyspark/jars/HikariCP-2.5.1.jar",
      "System Classpath"
    ],
    """
    classpath_entries: List[List[str]] = field(default_factory=list)
    """
    [
      "adl.feature.ownerandgroup.enableupn",
      "false"
    ],
    [
      "adl.http.timeout",
      "-1"
    ],
    """
    hadoop_properties: List[List[str]] = field(default_factory=list)
    """
    [
      "*.sink.servlet.class",
      "org.apache.spark.metrics.sink.MetricsServlet"
    ],
    [
      "*.sink.servlet.path",
      "/metrics/json"
    ],
    """
    metrics_properties: List[List[str]] = field(default_factory=list)
    resource_profiles: List[ResourceProfiles] = None
    runtime: Runtime = None
    """
    [
      "spark.app.id",
      "local-1697387564609"
    ],
    [
      "spark.app.name",
      "SparkMage"
    ],
    """
    spark_properties: List[List[str]] = field(default_factory=list)
    """
    [
      "SPARK_SUBMIT",
      "true"
    ],
    [
      "awt.toolkit",
      "sun.awt.X11.XToolkit"
    ],
    """
    system_properties: List[List[str]] = field(default_factory=list)

    def __post_init__(self):
        if self.resource_profiles:
            self.resource_profiles = \
                [ResourceProfiles.load(**model) for model in self.resource_profiles]

        if self.runtime:
            self.runtime = Runtime.load(**self.runtime)
