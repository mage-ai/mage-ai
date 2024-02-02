import StreamingPipeline from '@oracle/icons/custom/StreamingPipeline';
import {
  AISparkle,
  BatchPipeline,
  DataIntegrationPipeline,
  TemplateShapes,
  Upload,
} from '@oracle/icons';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { UNIT } from '@oracle/styles/units/spacing';
import { randomNameGenerator } from '@utils/string';

const ICON_SIZE = UNIT * 1.5;

export const getNewPipelineButtonMenuItems = (
  createPipeline: (
    reqBody: { pipeline: { name: string, type?: PipelineTypeEnum } },
  ) => void,
  opts?: {
    showImportPipelineModal?: () => void;
    showAIModal?: () => void;
    showBrowseTemplates?: () => void;
  },
) => {
  const arr = [
    {
      beforeIcon: <BatchPipeline />,
      label: () => 'Standard (batch)',
      onClick: () => createPipeline({
        pipeline: {
          name: randomNameGenerator(),
        },
      }),
      uuid: 'Pipelines/NewPipelineMenu/standard',
    },
    {
      beforeIcon: <DataIntegrationPipeline />,
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
      beforeIcon: <StreamingPipeline size={ICON_SIZE} />,
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

  if (opts?.showBrowseTemplates) {
    arr.push({
      beforeIcon: <TemplateShapes />,
      label: () => 'From a template',
      onClick: () => opts?.showBrowseTemplates?.(),
      uuid: 'Pipelines/NewPipelineMenu/custom_template',
    });
  }

  if (opts?.showImportPipelineModal) {
    arr.push({
      beforeIcon: <Upload />,
      label: () => 'Import pipeline zip',
      onClick: () => opts?.showImportPipelineModal?.(),
      uuid: 'Pipelines/NewPipelineMenu/upload',
    });
  }

  if (opts?.showAIModal) {
    arr.push({
      beforeIcon: <AISparkle />,
      label: () => 'Using AI (beta)',
      onClick: () => opts?.showAIModal?.(),
      uuid: 'Pipelines/NewPipelineMenu/AI_modal',
    });
  }

  return arr;
};
