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
  file_path: string;
  target?: string;
  uuid: string;
}

interface DBTProjectType {
  file_path: string;
  name: string;
  uuid: string;
}

interface DBTCacheItemType {
  models: string[];
  profiles?: DBTProfileType;
  project?: DBTProjectType;
}

export default interface CacheItemType {
  item: DBTCacheItemType;
  item_type: CacheItemTypeEnum;
  uuid: string;
}
