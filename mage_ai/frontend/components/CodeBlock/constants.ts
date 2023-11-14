import BlockType from '@interfaces/BlockType';
import { UNIT } from '@oracle/styles/units/spacing';

export const TAB_DBT_PREVIEW_UUID = { uuid: 'PREVIEW RESULTS' };
export const TAB_DBT_LOGS_UUID = { uuid: 'LOGS' };
export const TAB_DBT_SQL_UUID = { uuid: 'SQL' };
export const TAB_DBT_LINEAGE_UUID = { uuid: 'LINEAGE' };
export const TABS_DBT = ({
  metadata,
}: BlockType) => {
  const arr = [
    TAB_DBT_LOGS_UUID,
    TAB_DBT_SQL_UUID,
  ];

  const snapshot = metadata?.dbt?.block?.snapshot;

  if (!snapshot) {
    arr.unshift(TAB_DBT_PREVIEW_UUID);
    arr.push(TAB_DBT_LINEAGE_UUID);
  }

  return arr;
};

export const TAB_SPARK_JOBS = { uuid: 'Jobs' };
export const TAB_SPARK_OUTPUT = { uuid: 'Output' };
export const TAB_SPARK_SQLS = { uuid: 'SQLs' };
export const TAB_SPARK_STAGES = { uuid: 'Stages & Tasks' };
export const TAB_SPARK_TASKS = { uuid: 'Tasks' };

export const TABS_SPARK = (block: BlockType) => {
  const arr = [
    TAB_SPARK_OUTPUT,
    TAB_SPARK_JOBS,
    TAB_SPARK_STAGES,
    TAB_SPARK_SQLS,
  ];

  return arr;
};

export const DEFAULT_ICON_SIZE = UNIT * 2.5;
export const DRAG_AND_DROP_TYPE = 'CodeBlock_HiddenBlock';

export const SUBHEADER_TAB_CODE = {
  label: () => 'CODE',
  uuid: 'code',
};

export const SUBHEADER_TAB_INTERACTIONS = {
  label: () => 'INTERACTIONS',
  uuid: 'interactions',
};

export const SUBHEADER_TABS = [
  SUBHEADER_TAB_CODE,
  SUBHEADER_TAB_INTERACTIONS,
];
