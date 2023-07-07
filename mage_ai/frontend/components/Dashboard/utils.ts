import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { randomNameGenerator } from '@utils/string';

export const getNewPipelineButtonMenuItems = (
  createPipeline: (
    reqBody: { pipeline: { name: string, type?: PipelineTypeEnum } },
  ) => void,
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
