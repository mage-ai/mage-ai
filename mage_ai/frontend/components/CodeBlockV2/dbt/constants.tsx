import BlockType from '@interfaces/BlockType';
import { AlertTriangle, Code, NavDashboard, SettingsWithKnobs, TreeWithArrowsUp } from '@oracle/icons';
import { validate } from './utils';

export enum HeaderTabEnum {
  CODE = 'code',
  CONFIGURATION = 'configuration',
  LINEAGE = 'lineage',
  OVERVIEW = 'overview',
}

export enum OutputTabEnum {
  LOGS = 'execution logs',
  OUTPUT = 'output data',
}

export function buildHeaderTabs({
  block,
}: {
  block: BlockType;
}) {
  return [
    {
      // Icon: Code,
      uuid: HeaderTabEnum.CODE,
    },
    {
      icon: validate(block) ? <AlertTriangle danger /> : null,
      uuid: HeaderTabEnum.CONFIGURATION,
    },
    // {
    //   // Icon: NavDashboard,
    //   uuid: HeaderTabEnum.OVERVIEW,
    // },
    {
      // Icon: TreeWithArrowsUp,
      uuid: HeaderTabEnum.LINEAGE,
    },
  ];
}

export function buildOutputTabs({
  block,
}: {
  block: BlockType;
}) {
  return [
    {
      uuid: OutputTabEnum.OUTPUT,
    },
    {
      uuid: OutputTabEnum.LOGS,
    },
  ];
}

