import {
  AISparkle,
  BatchPipeline,
  IntegrationPipeline,
  StreamingPipeline,
  TemplateShapes,
  Upload,
} from '@oracle/icons';
import { generateUUID } from '@utils/uuids/generator';
import { PipelineTypeEnum } from '@interfaces/PipelineType';
import { UNIT } from '@oracle/styles/units/spacing';
import { randomNameGenerator, capitalize } from '@utils/string';
import {
  PipelineExecutionFrameworkUUIDEnum,
  FRAMEWORK_NAME_MAPPING,
} from '@interfaces/PipelineExecutionFramework/types';

const ICON_SIZE = UNIT * 1.5;

export const getNewPipelineButtonMenuItems = (
  createPipeline: (reqBody: { pipeline: { name: string; type?: PipelineTypeEnum } }) => void,
  opts?: {
    createRAG: any;
    showAIModal?: () => void;
    showBrowseTemplates?: () => void;
    showCreatePipelineModal?: (opts: { pipelineType: PipelineTypeEnum }) => void;
    showImportPipelineModal?: () => void;
  },
) => {
  const arr = [
    {
      beforeIcon: <BatchPipeline />,
      label: () => 'Standard (batch)',
      onClick: () => {
        if (opts?.showCreatePipelineModal) {
          opts?.showCreatePipelineModal?.({ pipelineType: PipelineTypeEnum.PYTHON });
        } else {
          createPipeline({
            pipeline: {
              name: randomNameGenerator(),
            },
          });
        }
      },
      uuid: 'Pipelines/NewPipelineMenu/standard',
    },
    {
      beforeIcon: <IntegrationPipeline />,
      label: () => 'Data integration',
      onClick: () => {
        if (opts?.showCreatePipelineModal) {
          opts?.showCreatePipelineModal?.({ pipelineType: PipelineTypeEnum.INTEGRATION });
        } else {
          createPipeline({
            pipeline: {
              name: randomNameGenerator(),
              type: PipelineTypeEnum.INTEGRATION,
            },
          });
        }
      },
      uuid: 'Pipelines/NewPipelineMenu/integration',
    },
    {
      beforeIcon: <StreamingPipeline size={ICON_SIZE} />,
      label: () => 'Streaming',
      onClick: () => {
        if (opts?.showCreatePipelineModal) {
          opts?.showCreatePipelineModal?.({ pipelineType: PipelineTypeEnum.STREAMING });
        } else {
          createPipeline({
            pipeline: {
              name: randomNameGenerator(),
              type: PipelineTypeEnum.STREAMING,
            },
          });
        }
      },
      uuid: 'Pipelines/NewPipelineMenu/streaming',
    },
    {
      beforeIcon: <AISparkle size={ICON_SIZE} />,
      label: () => FRAMEWORK_NAME_MAPPING[PipelineExecutionFrameworkUUIDEnum.RAG],
      onClick: () => {
        opts?.createRAG?.({
          pipeline: {
            name: capitalize(generateUUID()),
          },
        });
      },
      uuid: 'Pipelines/NewPipelineMenu/RAG',
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
