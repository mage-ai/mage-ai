import { randomNameGenerator } from '@utils/string';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';

export const getNewPipelineButtonMenuItems = (
  createPipeline: (reqBody: { pipeline: PipelineType }) => void,
) => [
  {
    label: () => 'Standard (batch)',
    onClick: () => createPipeline({
      pipeline: {
        name: randomNameGenerator(),
      },
    }),
    uuid: 'Pipelines/NewPipelineMenu/standard',
  },
  {
    label: () => 'Data integration',
    onClick: () => createPipeline({
      pipeline: {
        name: randomNameGenerator(),
        type: PipelineTypeEnum.INTEGRATION,
      },
    }),
    uuid: 'Pipelines/NewPipelineMenu/integration',
  },
  {
    label: () => 'Streaming',
    onClick: () => createPipeline({
      pipeline: {
        name: randomNameGenerator(),
        type: PipelineTypeEnum.STREAMING,
      },
    }),
    uuid: 'Pipelines/NewPipelineMenu/streaming',
  },
];
