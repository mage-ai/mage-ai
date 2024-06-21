import PipelineExecutionFrameworkType from '@interfaces/PipelineExecutionFramework/interfaces';
import PipelineType from '@interfaces/Pipeline';
import { extractNestedBlocks } from '@utils/models/pipeline';
import { indexBy } from '@utils/array';
import { isDebug } from '@utils/environment';

export function buildDependencies(
  pipelineExecutionFramework: PipelineExecutionFrameworkType,
  pipelineExecutionFrameworks: PipelineExecutionFrameworkType[],
  pipeline: PipelineType,
  pipelines: PipelineType[],
) {
  const pipelinesMapping = indexBy(pipelines, ({ uuid }) => uuid);
  const blocksMapping = extractNestedBlocks(pipeline, pipelinesMapping);
  const groupsMapping = extractNestedBlocks(
    pipelineExecutionFramework, indexBy(pipelineExecutionFrameworks, ({ uuid }) => uuid));

  isDebug() && console.log(
    'groupsMapping', groupsMapping,
    'blocksMapping', blocksMapping,
  );

  return {};
}
