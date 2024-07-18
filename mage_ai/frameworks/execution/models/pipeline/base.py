from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import List, Optional

from mage_ai.data_preparation.models.constants import BlockType, PipelineType
from mage_ai.frameworks.execution.models.base import BaseExecutionFramework
from mage_ai.frameworks.execution.models.block.base import BlockExecutionFramework
from mage_ai.shared.array import flatten
from mage_ai.shared.hash import group_by, merge_dict


@dataclass
class PipelineExecutionFramework(BaseExecutionFramework):
    blocks: Optional[List[BlockExecutionFramework]] = None
    pipelines: Optional[List[PipelineExecutionFramework]] = None
    type: Optional[PipelineType] = PipelineType.EXECUTION_FRAMEWORK

    def __post_init__(self):
        self.serialize_attribute_classes('blocks', BlockExecutionFramework)
        self.serialize_attribute_classes('pipelines', PipelineExecutionFramework)
        self.serialize_attribute_enum('type', PipelineType)

    def get_pipelines(self, level: Optional[int] = None) -> List[PipelineExecutionFramework]:
        arr = []
        if level is None or level >= 1:
            arr += self.pipelines or []
            if (level is None or level >= 2) and self.pipelines:
                arr += flatten([
                    framework.get_pipelines(level=level) for framework in self.pipelines
                ])
        return arr

    def flatten_block_groups(self):
        """
        Example pipeline hierarchy:
        PIPELINE.RAG = {
            PIPELINE.DATA_PREPARATION: {
                PIPELINE.LOAD: [GROUP.INGEST, GROUP.MAP],
                PIPELINE.TRANSFORM: [
                    GROUP.CLEANING,
                    GROUP.ENRICH,
                    GROUP.CHUNKING,
                    GROUP.TOKENIZATION,
                    GROUP.EMBED,
                ],
                PIPELINE.EXPORT: [GROUP.VECTOR_DATABASE, GROUP.KNOWLEDGE_GRAPH],
                PIPELINE.INDEX: [
                    GROUP.CONTEXTUAL_DICTIONARY,
                    GROUP.DOCUMENT_HIERARCHY,
                    GROUP.SEARCH_INDEX,
                ],
            },
            PIPELINE.INFERENCE: {
                PIPELINE.QUERY_PROCESSING: [
                    GROUP.INTENT_DETECTION,
                    GROUP.QUERY_DECOMPOSITION,
                    GROUP.QUERY_AUGMENTATION,
                ],
                PIPELINE.RETRIEVAL: [
                    GROUP.ITERATIVE_RETRIEVAL,
                    GROUP.MEMORY,
                    GROUP.MULTI_HOP_REASONING,
                    GROUP.RANKING,
                ],
                PIPELINE.RESPONSE_GENERATION: [
                    GROUP.CONTEXTUALIZATION,
                    GROUP.RESPONSE_SYNTHESIS,
                    GROUP.ANSWER_ENRICHMENT,
                    GROUP.RESPONSE_FORMATTING,
                ],
            },
        }
        """
        # Flattened block execution frameworks that are GROUP type
        block_groups = []
        # All flattened block execution frameworks
        block_execution_frameworks = []
        # Map pipeline uuid to its root and leaf nodes
        pipeline_configs = dict()
        pipelines_queue = deque()
        pipelines_queue.append(self)
        while pipelines_queue:
            pipeline = pipelines_queue.pop()
            pipeline_configs[pipeline.uuid] = dict(
                root_nodes=[],
                leaf_nodes=[],
            )
            for b in pipeline.blocks:
                block_execution_frameworks.append(b)
                if b.type == BlockType.GROUP:
                    block_groups.append(
                        dict(
                            block_group=b,
                            pipeline=pipeline,
                            upstream_block_groups=b.upstream_blocks,
                            downstream_block_groups=b.downstream_blocks,
                        )
                    )
                if not b.upstream_blocks:
                    pipeline_configs[pipeline.uuid]['root_nodes'].append(b)
                if not b.downstream_blocks:
                    pipeline_configs[pipeline.uuid]['leaf_nodes'].append(b)

            if pipeline.pipelines:
                for child_pipeline in pipeline.pipelines:
                    pipelines_queue.append(child_pipeline)

        block_execution_frameworks_by_uuid = {b.uuid: b for b in block_execution_frameworks}

        # Add upstream and downstream groups for the root and leaf nodes in the pipelines
        for block_group in block_groups:
            if not block_group['upstream_block_groups']:
                # Root node
                p = block_group['pipeline']
                if p:
                    pipeline_block = block_execution_frameworks_by_uuid.get(p.uuid)
                    if pipeline_block and pipeline_block.upstream_blocks:
                        leaf_nodes_of_upstream_pipelines = []
                        for b in pipeline_block.upstream_blocks:
                            leaf_nodes_of_upstream_pipelines += \
                                pipeline_configs.get(b, dict()).get('leaf_nodes', [])
                        block_group['upstream_block_groups'] = \
                            [b.uuid for b in leaf_nodes_of_upstream_pipelines]

            if not block_group['downstream_block_groups']:
                # Leaf node
                p = block_group['pipeline']
                if p:
                    pipeline_block = block_execution_frameworks_by_uuid.get(p.uuid)
                    if pipeline_block and pipeline_block.downstream_blocks:
                        root_nodes_of_downstream_pipelines = []
                        for b in pipeline_block.downstream_blocks:
                            root_nodes_of_downstream_pipelines += \
                                pipeline_configs.get(b, dict()).get('root_nodes', [])
                        block_group['downstream_block_groups'] = \
                            [b.uuid for b in root_nodes_of_downstream_pipelines]

        return block_groups

    def initialize_block_instances(self, blocks_by_uuid):
        """
        Initialize the block instances by Enforcing block settings with the framework.

        1. Construct a map of blocks by group
        2. Get flattened block groups and their dependencies of this framework
        3. Set the block dependencies for block instances
        4. Set the block configurations for block instances
        """

        blocks_with_group = [b for b in blocks_by_uuid.values() if b.groups]
        blocks_by_group = group_by(lambda b: b.groups[0], blocks_with_group)

        flatten_blocks = self.flatten_block_groups()
        flatten_block_groups_by_uuid = {b['block_group'].uuid: b for b in flatten_blocks}

        def find_upstream_blocks(block_group: str):
            upstream_blocks = []
            upstream_block_groups = block_group.get('upstream_block_groups', [])
            for guuid in upstream_block_groups:
                if guuid in blocks_by_group:
                    upstream_blocks.append(blocks_by_group[guuid])
                elif guuid in flatten_block_groups_by_uuid:
                    upstream_blocks.append(
                        find_upstream_blocks(flatten_block_groups_by_uuid[guuid]))

            return list(set(flatten(upstream_blocks)))

        def find_downstream_blocks(block_group: str):
            downstream_blocks = []
            downstream_block_groups = block_group.get('downstream_block_groups', [])
            for guuid in downstream_block_groups:
                if guuid in blocks_by_group:
                    downstream_blocks.append(blocks_by_group[guuid])
                elif guuid in flatten_block_groups_by_uuid:
                    downstream_blocks.append(
                        find_downstream_blocks(flatten_block_groups_by_uuid[guuid]))

            return list(set(flatten(downstream_blocks)))

        for b in blocks_with_group:
            block_group = flatten_block_groups_by_uuid.get(b.groups[0])
            if not block_group:
                continue
            block_group_configuration = block_group['block_group'].configuration
            b.configuration = merge_dict(
                b.configuration or dict(),
                block_group_configuration.to_dict(ignore_attributes=['templates'])
                if block_group_configuration else dict(),
            )
            if block_group['upstream_block_groups']:
                b.upstream_blocks = find_upstream_blocks(block_group)

            if block_group['downstream_block_groups']:
                b.downstream_blocks = find_downstream_blocks(block_group)
