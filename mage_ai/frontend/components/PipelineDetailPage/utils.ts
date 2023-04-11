import BackfillGradient from '@oracle/icons/custom/BackfillGradient';
import BlocksSeparatedGradient from '@oracle/icons/custom/BlocksSeparatedGradient';
import BlocksStackedGradient from '@oracle/icons/custom/BlocksStackedGradient';
import ChartGradient from '@oracle/icons/custom/ChartGradient';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import ScheduleGradient from '@oracle/icons/custom/ScheduleGradient';
import TodoListGradient from '@oracle/icons/custom/TodoListGradient';
import {
  Backfill,
  BlocksSeparated,
  BlocksStacked,
  Chart,
  Schedule,
  Settings,
  TodoList,
} from '@oracle/icons';
import { PageNameEnum } from './constants';
import { isViewer } from '@utils/session';

export function buildNavigationItems(pageName: PageNameEnum, pipeline: PipelineType) {
  const { uuid: pipelineUUID } = pipeline || {};

  const navigationItems = [
    {
      Icon: Schedule,
      IconSelected: ScheduleGradient,
      id: PageNameEnum.TRIGGERS,
      isSelected: () => PageNameEnum.TRIGGERS === pageName,
      label: () => 'Triggers',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/triggers`,
        href: '/pipelines/[pipeline]/triggers',
      },
    },
    {
      Icon: BlocksStacked,
      IconSelected: BlocksStackedGradient,
      id: PageNameEnum.RUNS,
      isSelected: () => PageNameEnum.RUNS === pageName,
      label: () => 'Runs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/runs`,
        href: '/pipelines/[pipeline]/runs',
      },
    },
    {
      Icon: Backfill,
      IconSelected: BackfillGradient,
      id: PageNameEnum.BACKFILLS,
      isSelected: () => PageNameEnum.BACKFILLS === pageName,
      label: () => 'Backfills',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/backfills`,
        href: '/pipelines/[pipeline]/backfills',
      },
    },
    {
      Icon: TodoList,
      IconSelected: TodoListGradient,
      id: PageNameEnum.PIPELINE_LOGS,
      isSelected: () => PageNameEnum.PIPELINE_LOGS === pageName,
      label: () => 'Logs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/logs`,
        href: '/pipelines/[pipeline]/logs',
      },
    },
    {
      Icon: Chart,
      IconSelected: ChartGradient,
      id: PageNameEnum.MONITOR,
      isSelected: () => PageNameEnum.MONITOR === pageName,
      label: () => 'Monitor',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/monitors`,
        href: '/pipelines/[pipeline]/monitors',
      },
    },
  ];

  if (PipelineTypeEnum.INTEGRATION === pipeline?.type) {
    navigationItems.unshift({
      Icon: BlocksSeparated,
      IconSelected: BlocksSeparatedGradient,
      id: PageNameEnum.SYNCS,
      isSelected: () => PageNameEnum.SYNCS === pageName,
      label: () => 'Syncs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/syncs`,
        href: '/pipelines/[pipeline]/syncs',
      },
    });
  }

  if (!isViewer()) {
    // @ts-ignore
    navigationItems.unshift({
      Icon: null,
      IconSelected: null,
      id: PageNameEnum.EDIT,
      label: () => 'Edit pipeline',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/edit`,
        href: '/pipelines/[pipeline]/edit',
      },
    });

    // @ts-ignore
    navigationItems.push({
      Icon: Settings,
      IconSelected: null,
      id: PageNameEnum.SETTINGS,
      isSelected: () => PageNameEnum.SETTINGS === pageName,
      label: () => 'Pipeline settings',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/settings`,
        href: '/pipelines/[pipeline]/settings',
      },
    });
  }

  return navigationItems;
}
