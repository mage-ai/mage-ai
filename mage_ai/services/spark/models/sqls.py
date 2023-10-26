from dataclasses import dataclass, field
from enum import Enum
from typing import List

from mage_ai.services.spark.models.base import BaseSparkModel
from mage_ai.services.spark.models.jobs import Job
from mage_ai.services.spark.models.stages import StageAttempt


class SqlStatus(str, Enum):
    COMPLETED = 'COMPLETED'


@dataclass
class Metric(BaseSparkModel):
    name: str = None  # "number of partitions",
    value: str = None  # "10,000"


@dataclass
class Edge(BaseSparkModel):
    from_id: int = None  # 18
    to_id: int = None  # 17


@dataclass
class Node(BaseSparkModel):
    metrics: List[Metric] = field(default_factory=list)
    node_id: int = None  # 13
    node_name: str = None  # AQEShuffleRead
    whole_stage_codegen_id: int = None  # 2

    def __post_init__(self):
        if self.metrics:
            self.metrics = [Metric.load(**model) for model in self.metrics]

    @property
    def id(self) -> int:
        return self.node_id


@dataclass
class Sql(BaseSparkModel):
    description: str = None  # "collect at /home/src/default_repo/data_loaders/misty_thunder.py:39"
    duration: int = None  # 672
    edges: List[Edge] = field(default_factory=list)
    failed_job_ids: List[int] = field(default_factory=list)  # []
    id: int = None  # 0
    jobs: List[Job] = field(default_factory=list)
    """
    == Physical Plan ==
    AdaptiveSparkPlan (27)
    +- == Final Plan ==
       * HashAggregate (18)
       +- * HashAggregate (17)
          +- * Project (16)
             +- * BroadcastHashJoin Inner BuildLeft (15)
                :- BroadcastQueryStage (8), Statistics(sizeInBytes=1035.2 KiB, rowCount=1.00E+4)
                :  +- BroadcastExchange (7)
                :     +- AQEShuffleRead (6)
                :        +- ShuffleQueryStage (5), Statistics(sizeInBytes=625.0 KiB, rowCount=1.00
                :           +- Exchange (4)
                :              +- * Project (3)
                :                 +- * Filter (2)
                :                    +- * Scan ExistingRDD (1)
                +- AQEShuffleRead (14)
                   +- ShuffleQueryStage (13), Statistics(sizeInBytes=156.3 KiB, rowCount=1.00E+4)
                      +- Exchange (12)
                         +- * Project (11)
                            +- * Filter (10)
                               +- * Scan ExistingRDD (9)
    +- == Initial Plan ==
       HashAggregate (26)
       +- HashAggregate (25)
          +- Project (24)
             +- SortMergeJoin Inner (23)
                :- Sort (20)
                :  +- Exchange (19)
                :     +- Project (3)
                :        +- Filter (2)
                :           +- Scan ExistingRDD (1)
                +- Sort (22)
                   +- Exchange (21)
                      +- Project (11)
                         +- Filter (10)
                            +- Scan ExistingRDD (9)
    """
    nodes: List[Node] = field(default_factory=list)
    plan_description: str = None
    running_job_ids: List[int] = field(default_factory=list)  # []
    stages: List[StageAttempt] = field(default_factory=list)
    status: int = SqlStatus  # "COMPLETED"
    submission_time: str = None  # "2023-10-15T16:32:49.088GMT"
    success_job_ids: List[int] = field(default_factory=list)  # [3, 4, 5, 6]

    def __post_init__(self):
        if self.edges:
            self.edges = [Edge.load(**edge) for edge in self.edges]

        if self.jobs:
            self.jobs = [Job.load(**m) for m in self.jobs]

        if self.nodes:
            self.nodes = [Node.load(**node) for node in self.nodes]

        if self.stages:
            self.stages = [StageAttempt.load(**m) for m in self.stages]

        if self.status:
            try:
                self.status = SqlStatus(self.status)
            except ValueError as err:
                print(f'[WARNING] Thread: {err}')
                self.status = self.status
