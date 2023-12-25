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
  COMPILED_CODE = 'compiled_code',
  LOGS = 'logs',
  OUTPUT = 'output',
  SAMPLE_DATA = 'sample_data',
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
    {
      // Icon: NavDashboard,
      uuid: HeaderTabEnum.OVERVIEW,
    },
    {
      // Icon: TreeWithArrowsUp,
      uuid: HeaderTabEnum.LINEAGE,
    },
  ];
}
