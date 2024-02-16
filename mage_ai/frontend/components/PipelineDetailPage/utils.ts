import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import {
  BackfillV2,
  Code,
  Lightning,
  Logs,
  Monitor,
  NavDashboard,
  PipeIcon,
  Schedule,
  SettingsWithKnobs,
} from '@oracle/icons';
import { PageNameEnum } from './constants';
import { isViewer } from '@utils/session';

export function buildNavigationItems(
  pageName: PageNameEnum,
  pipeline: PipelineType,
  pipelineUUIDFromUrl?: string,
) {
  const { uuid } = pipeline || {};
  const pipelineUUID = uuid || pipelineUUIDFromUrl;

  const navigationItems = [
    {
      Icon: Lightning,
      id: PageNameEnum.TRIGGERS,
      isSelected: () => PageNameEnum.TRIGGERS === pageName,
      label: () => 'Triggers',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/triggers`,
        href: '/pipelines/[pipeline]/triggers',
      },
    },
    {
      Icon: Schedule,
      id: PageNameEnum.RUNS,
      isSelected: () => PageNameEnum.RUNS === pageName,
      label: () => 'Runs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/runs`,
        href: '/pipelines/[pipeline]/runs',
      },
    },
    {
      Icon: Logs,
      id: PageNameEnum.PIPELINE_LOGS,
      isSelected: () => PageNameEnum.PIPELINE_LOGS === pageName,
      label: () => 'Logs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/logs`,
        href: '/pipelines/[pipeline]/logs',
      },
    },
    {
      Icon: Monitor,
      id: PageNameEnum.MONITOR,
      isSelected: () => PageNameEnum.MONITOR === pageName,
      label: () => 'Monitor',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/monitors`,
        href: '/pipelines/[pipeline]/monitors',
      },
    },
  ];

  if (PipelineTypeEnum.PYTHON === pipeline?.type) {
    navigationItems.splice(2, 0, {
      Icon: BackfillV2,
      id: PageNameEnum.BACKFILLS,
      isSelected: () => PageNameEnum.BACKFILLS === pageName,
      label: () => 'Backfills',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/backfills`,
        href: '/pipelines/[pipeline]/backfills',
      },
    });
  }

  if (PipelineTypeEnum.INTEGRATION === pipeline?.type) {
    navigationItems.unshift({
      Icon: PipeIcon,
      id: PageNameEnum.SYNCS,
      isSelected: () => PageNameEnum.SYNCS === pageName,
      label: () => 'Syncs',
      linkProps: {
        as: `/pipelines/${pipelineUUID}/syncs`,
        href: '/pipelines/[pipeline]/syncs',
      },
    });
  }

  // @ts-ignore
  navigationItems.unshift({
    Icon: Code,
    // @ts-ignore
    disabled: !pipelineUUID,
    id: PageNameEnum.EDIT,
    isSelected: () => PageNameEnum.EDIT === pageName,
    label: () => isViewer() ? 'View pipeline': 'Edit pipeline',
    linkProps: {
      as: `/pipelines/${pipelineUUID}/edit`,
      href: '/pipelines/[pipeline]/edit',
    },
  });

  // @ts-ignore
  navigationItems.push({
    Icon: SettingsWithKnobs,
    id: PageNameEnum.SETTINGS,
    isSelected: () => PageNameEnum.SETTINGS === pageName,
    label: () => 'Pipeline settings',
    linkProps: {
      as: `/pipelines/${pipelineUUID}/settings`,
      href: '/pipelines/[pipeline]/settings',
    },
  });

  navigationItems.unshift({
    Icon: NavDashboard,
    id: PageNameEnum.DASHBOARD,
    isSelected: () => PageNameEnum.DASHBOARD === pageName,
    label: () => 'Dashboard',
    linkProps: {
      as: `/pipelines/${pipelineUUID}/dashboard`,
      href: '/pipelines/[pipeline]/dashboard',
    },
  });

  return navigationItems;
}
