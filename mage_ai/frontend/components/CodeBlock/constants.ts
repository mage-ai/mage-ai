import BlockType from '@interfaces/BlockType';
import { UNIT } from '@oracle/styles/units/spacing';

export const TAB_DBT_PREVIEW_UUID = { uuid: 'Preview results' };
export const TAB_DBT_LOGS_UUID = { uuid: 'Logs' };
export const TAB_DBT_SQL_UUID = { uuid: 'SQL' };
export const TAB_DBT_LINEAGE_UUID = { uuid: 'Lineage' };
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

export const DEFAULT_ICON_SIZE = UNIT * 2.5;
export const DRAG_AND_DROP_TYPE = 'CodeBlock_HiddenBlock';
