import BlockType from '@interfaces/BlockType';
import { AlertTriangle } from '@oracle/icons';
import { validate } from './utils';

export const SHARED_SETUP_ROW_PROPS = {
  inputFlex: 1,
  large: false,
};
export const SHARED_INPUT_PROPS = {
  compact: true,
  monospace: true,
};

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

