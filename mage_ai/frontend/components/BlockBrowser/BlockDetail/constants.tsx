export enum TabEnum {
  CODE = 'Compiled code',
  DATA = 'Sample data',
  LINEAGE = 'Lineage',
  OVERVIEW = 'Overview',
  PIPELINES = 'Pipelines and runs',
}

export const TABS = [
  {
    uuid: TabEnum.OVERVIEW,
  },
  {
    uuid: TabEnum.DATA,
  },
  {
    uuid: TabEnum.LINEAGE,
  },
  {
    uuid: TabEnum.PIPELINES,
  },
  {
    uuid: TabEnum.CODE,
  },
];
