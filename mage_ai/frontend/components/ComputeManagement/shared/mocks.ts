export const MOCK_SQL = {
  "id": 19,
  "status": "COMPLETED",
  "description": "count at NativeMethodAccessorImpl.java:0",
  "plan_description": "== Physical Plan ==\nAdaptiveSparkPlan (17)\n+- == Final Plan ==\n   * HashAggregate (11)\n   +- ShuffleQueryStage (10), Statistics(sizeInBytes=16.0 B, rowCount=1)\n      +- Exchange (9)\n         +- * HashAggregate (8)\n            +- * HashAggregate (7)\n               +- AQEShuffleRead (6)\n                  +- ShuffleQueryStage (5), Statistics(sizeInBytes=80.0 B, rowCount=5)\n                     +- Exchange (4)\n                        +- * HashAggregate (3)\n                           +- * Project (2)\n                              +- * Scan ExistingRDD (1)\n+- == Initial Plan ==\n   HashAggregate (16)\n   +- Exchange (15)\n      +- HashAggregate (14)\n         +- HashAggregate (13)\n            +- Exchange (12)\n               +- HashAggregate (3)\n                  +- Project (2)\n                     +- Scan ExistingRDD (1)\n\n\n(1) Scan ExistingRDD [codegen id : 1]\nOutput [10]: [user ID#355L, meal transaction ID#356L, paid at#357, restaurant ID#358L, cuisine#359, revenue#360L, ambience#361, rating#362L, award winning dishes#363L, number of reviews#364L]\nArguments: [user ID#355L, meal transaction ID#356L, paid at#357, restaurant ID#358L, cuisine#359, revenue#360L, ambience#361, rating#362L, award winning dishes#363L, number of reviews#364L], MapPartitionsRDD[117] at applySchemaToPythonRDD at NativeMethodAccessorImpl.java:0, ExistingRDD, UnknownPartitioning(0)\n\n(2) Project [codegen id : 1]\nOutput [1]: [rating#362L]\nInput [10]: [user ID#355L, meal transaction ID#356L, paid at#357, restaurant ID#358L, cuisine#359, revenue#360L, ambience#361, rating#362L, award winning dishes#363L, number of reviews#364L]\n\n(3) HashAggregate [codegen id : 1]\nInput [1]: [rating#362L]\nKeys [1]: [rating#362L]\nFunctions: []\nAggregate Attributes: []\nResults [1]: [rating#362L]\n\n(4) Exchange\nInput [1]: [rating#362L]\nArguments: hashpartitioning(rating#362L, 200), ENSURE_REQUIREMENTS, [plan_id=372]\n\n(5) ShuffleQueryStage\nOutput [1]: [rating#362L]\nArguments: 0\n\n(6) AQEShuffleRead\nInput [1]: [rating#362L]\nArguments: coalesced\n\n(7) HashAggregate [codegen id : 2]\nInput [1]: [rating#362L]\nKeys [1]: [rating#362L]\nFunctions: []\nAggregate Attributes: []\nResults: []\n\n(8) HashAggregate [codegen id : 2]\nInput: []\nKeys: []\nFunctions [1]: [partial_count(1)]\nAggregate Attributes [1]: [count#398L]\nResults [1]: [count#399L]\n\n(9) Exchange\nInput [1]: [count#399L]\nArguments: SinglePartition, ENSURE_REQUIREMENTS, [plan_id=402]\n\n(10) ShuffleQueryStage\nOutput [1]: [count#399L]\nArguments: 1\n\n(11) HashAggregate [codegen id : 3]\nInput [1]: [count#399L]\nKeys: []\nFunctions [1]: [count(1)]\nAggregate Attributes [1]: [count(1)#395L]\nResults [1]: [count(1)#395L AS count#396L]\n\n(12) Exchange\nInput [1]: [rating#362L]\nArguments: hashpartitioning(rating#362L, 200), ENSURE_REQUIREMENTS, [plan_id=353]\n\n(13) HashAggregate\nInput [1]: [rating#362L]\nKeys [1]: [rating#362L]\nFunctions: []\nAggregate Attributes: []\nResults: []\n\n(14) HashAggregate\nInput: []\nKeys: []\nFunctions [1]: [partial_count(1)]\nAggregate Attributes [1]: [count#398L]\nResults [1]: [count#399L]\n\n(15) Exchange\nInput [1]: [count#399L]\nArguments: SinglePartition, ENSURE_REQUIREMENTS, [plan_id=357]\n\n(16) HashAggregate\nInput [1]: [count#399L]\nKeys: []\nFunctions [1]: [count(1)]\nAggregate Attributes [1]: [count(1)#395L]\nResults [1]: [count(1)#395L AS count#396L]\n\n(17) AdaptiveSparkPlan\nOutput [1]: [count#396L]\nArguments: isFinalPlan=true\n\n",
  "submission_time": "2023-10-15T09:08:16.203GMT",
  "duration": 181,
  "running_job_ids": [],
  "success_job_ids": [
    24,
    25,
    26
  ],
  "failed_job_ids": [],
  "nodes": [
    {
      "node_id": 12,
      "node_name": "Scan ExistingRDD",
      "whole_stage_codegen_id": 1,
      "metrics": [
        {
          "name": "number of output rows",
          "value": "10,000"
        }
      ]
    },
    {
      "node_id": 11,
      "node_name": "Project",
      "whole_stage_codegen_id": 1,
      "metrics": []
    },
    {
      "node_id": 10,
      "node_name": "HashAggregate",
      "whole_stage_codegen_id": 1,
      "metrics": [
        {
          "name": "spill size",
          "value": "total (min, med, max (stageId: taskId))\n0.0 B (0.0 B, 0.0 B, 0.0 B (stage 29.0: task 24))"
        },
        {
          "name": "time in aggregation build",
          "value": "total (min, med, max (stageId: taskId))\n44 ms (0 ms, 44 ms, 44 ms (stage 29.0: task 24))"
        },
        {
          "name": "peak memory",
          "value": "total (min, med, max (stageId: taskId))\n256.0 KiB (0.0 B, 256.0 KiB, 256.0 KiB (stage 29.0: task 24))"
        },
        {
          "name": "number of output rows",
          "value": "5"
        },
        {
          "name": "number of sort fallback tasks",
          "value": "0"
        },
        {
          "name": "avg hash probes per key",
          "value": "0"
        }
      ]
    },
    {
      "node_id": 9,
      "node_name": "WholeStageCodegen (1)",
      "metrics": [
        {
          "name": "duration",
          "value": "total (min, med, max (stageId: taskId))\n54 ms (0 ms, 54 ms, 54 ms (stage 29.0: task 24))"
        }
      ]
    },
    {
      "node_id": 8,
      "node_name": "Exchange",
      "metrics": [
        {
          "name": "shuffle records written",
          "value": "5"
        },
        {
          "name": "local merged chunks fetched",
          "value": "0"
        },
        {
          "name": "shuffle write time",
          "value": "total (min, med, max (stageId: taskId))\n3 ms (0 ms, 3 ms, 3 ms (stage 29.0: task 24))"
        },
        {
          "name": "remote merged bytes read",
          "value": "0.0 B"
        },
        {
          "name": "local merged blocks fetched",
          "value": "0"
        },
        {
          "name": "corrupt merged block chunks",
          "value": "0"
        },
        {
          "name": "remote merged reqs duration",
          "value": "0 ms"
        },
        {
          "name": "remote merged blocks fetched",
          "value": "0"
        },
        {
          "name": "records read",
          "value": "5"
        },
        {
          "name": "local bytes read",
          "value": "292.0 B"
        },
        {
          "name": "fetch wait time",
          "value": "0 ms"
        },
        {
          "name": "remote bytes read",
          "value": "0.0 B"
        },
        {
          "name": "merged fetch fallback count",
          "value": "0"
        },
        {
          "name": "local blocks read",
          "value": "1"
        },
        {
          "name": "remote merged chunks fetched",
          "value": "0"
        },
        {
          "name": "remote blocks read",
          "value": "0"
        },
        {
          "name": "data size",
          "value": "total (min, med, max (stageId: taskId))\n80.0 B (0.0 B, 80.0 B, 80.0 B (stage 29.0: task 24))"
        },
        {
          "name": "local merged bytes read",
          "value": "0.0 B"
        },
        {
          "name": "number of partitions",
          "value": "200"
        },
        {
          "name": "remote reqs duration",
          "value": "0 ms"
        },
        {
          "name": "remote bytes read to disk",
          "value": "0.0 B"
        },
        {
          "name": "shuffle bytes written",
          "value": "total (min, med, max (stageId: taskId))\n292.0 B (0.0 B, 292.0 B, 292.0 B (stage 29.0: task 24))"
        }
      ]
    },
    {
      "node_id": 7,
      "node_name": "AQEShuffleRead",
      "metrics": [
        {
          "name": "number of partitions",
          "value": "1"
        },
        {
          "name": "partition data size",
          "value": "300.0 B"
        },
        {
          "name": "number of coalesced partitions",
          "value": "1"
        }
      ]
    },
    {
      "node_id": 6,
      "node_name": "HashAggregate",
      "whole_stage_codegen_id": 2,
      "metrics": [
        {
          "name": "spill size",
          "value": "0.0 B"
        },
        {
          "name": "time in aggregation build",
          "value": "0 ms"
        },
        {
          "name": "peak memory",
          "value": "256.0 KiB"
        },
        {
          "name": "number of output rows",
          "value": "5"
        },
        {
          "name": "number of sort fallback tasks",
          "value": "0"
        },
        {
          "name": "avg hash probes per key",
          "value": "0"
        }
      ]
    },
    {
      "node_id": 5,
      "node_name": "HashAggregate",
      "whole_stage_codegen_id": 2,
      "metrics": [
        {
          "name": "spill size",
          "value": "0.0 B"
        },
        {
          "name": "time in aggregation build",
          "value": "2 ms"
        },
        {
          "name": "peak memory",
          "value": "0.0 B"
        },
        {
          "name": "number of output rows",
          "value": "1"
        },
        {
          "name": "number of sort fallback tasks",
          "value": "0"
        },
        {
          "name": "avg hash probes per key",
          "value": "0"
        }
      ]
    },
    {
      "node_id": 4,
      "node_name": "WholeStageCodegen (2)",
      "metrics": [
        {
          "name": "duration",
          "value": "3 ms"
        }
      ]
    },
    {
      "node_id": 3,
      "node_name": "Exchange",
      "metrics": [
        {
          "name": "shuffle records written",
          "value": "1"
        },
        {
          "name": "local merged chunks fetched",
          "value": "0"
        },
        {
          "name": "shuffle write time",
          "value": "total (min, med, max (stageId: taskId))\n0 ms (0 ms, 0 ms, 0 ms (stage 31.0: task 25))"
        },
        {
          "name": "remote merged bytes read",
          "value": "0.0 B"
        },
        {
          "name": "local merged blocks fetched",
          "value": "0"
        },
        {
          "name": "corrupt merged block chunks",
          "value": "0"
        },
        {
          "name": "remote merged reqs duration",
          "value": "0 ms"
        },
        {
          "name": "remote merged blocks fetched",
          "value": "0"
        },
        {
          "name": "records read",
          "value": "1"
        },
        {
          "name": "local bytes read",
          "value": "59.0 B"
        },
        {
          "name": "fetch wait time",
          "value": "0 ms"
        },
        {
          "name": "remote bytes read",
          "value": "0.0 B"
        },
        {
          "name": "merged fetch fallback count",
          "value": "0"
        },
        {
          "name": "local blocks read",
          "value": "1"
        },
        {
          "name": "remote merged chunks fetched",
          "value": "0"
        },
        {
          "name": "remote blocks read",
          "value": "0"
        },
        {
          "name": "data size",
          "value": "total (min, med, max (stageId: taskId))\n16.0 B (0.0 B, 16.0 B, 16.0 B (stage 31.0: task 25))"
        },
        {
          "name": "local merged bytes read",
          "value": "0.0 B"
        },
        {
          "name": "number of partitions",
          "value": "1"
        },
        {
          "name": "remote reqs duration",
          "value": "0 ms"
        },
        {
          "name": "remote bytes read to disk",
          "value": "0.0 B"
        },
        {
          "name": "shuffle bytes written",
          "value": "total (min, med, max (stageId: taskId))\n59.0 B (0.0 B, 59.0 B, 59.0 B (stage 31.0: task 25))"
        }
      ]
    },
    {
      "node_id": 2,
      "node_name": "HashAggregate",
      "whole_stage_codegen_id": 3,
      "metrics": [
        {
          "name": "time in aggregation build",
          "value": "0 ms"
        },
        {
          "name": "number of output rows",
          "value": "1"
        }
      ]
    },
    {
      "node_id": 1,
      "node_name": "WholeStageCodegen (3)",
      "metrics": [
        {
          "name": "duration",
          "value": "0 ms"
        }
      ]
    },
    {
      "node_id": 0,
      "node_name": "AdaptiveSparkPlan",
      "metrics": []
    }
  ],
  "edges": [
    {
      "from_id": 2,
      "to_id": 0
    },
    {
      "from_id": 3,
      "to_id": 2
    },
    {
      "from_id": 5,
      "to_id": 3
    },
    {
      "from_id": 6,
      "to_id": 5
    },
    {
      "from_id": 7,
      "to_id": 6
    },
    {
      "from_id": 8,
      "to_id": 7
    },
    {
      "from_id": 10,
      "to_id": 8
    },
    {
      "from_id": 11,
      "to_id": 10
    },
    {
      "from_id": 12,
      "to_id": 11
    }
  ]
};
