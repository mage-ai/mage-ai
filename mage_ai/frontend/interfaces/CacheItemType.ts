export enum CacheItemTypeEnum {
  DBT = 'dbt',
}

interface DBTProfileType {
  [projectName: string]: {
    outputs: {
      [targetName: string]: {
        [key: string]: string;
      };
    };
  };
  // @ts-ignore
  file_path: string;
  // @ts-ignore
  target?: string;
  // @ts-ignore
  uuid: string;
}

interface DBTProjectType {
  file_path: string;
  name: string;
  uuid: string;
}

export interface DBTCacheItemType {
  models: string[];
  profiles?: DBTProfileType;
  project?: DBTProjectType;
}

export default interface CacheItemType {
  item: DBTCacheItemType;
  item_type: CacheItemTypeEnum;
  uuid: string;
}
