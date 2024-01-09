import BlockType from '@interfaces/BlockType';

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

export interface DBTProjectType {
  file_path: string;
  name: string;
  profile: string;
  uuid: string;
}

interface DBTSchemaTestType {
  [testName: string]: {
    expression: string;
  };
}

interface DBTSchemaType {
  file_path: string;
  models?: {
    columns: {
      name: string;
      description?: string;
      tests?: DBTSchemaTestType[] | string[];
    }[];
    name: string;
    tests?: DBTSchemaTestType[] | string[];
  }[];
  uuid: string;
  version?: number;
}

export interface DBTCacheItemType {
  content_compiled?: string;
  data: {
    sample_data: {
      columns: string[];
      rows: string[][];
    };
    shape: number[];
    type: string;
  };
  exception?: string;
  logs?: string;
  models?: string[];
  profiles?: DBTProfileType;
  project?: DBTProjectType;
  schema?: DBTSchemaType[];
  upstream_blocks?: BlockType[];
}

export default interface CacheItemType {
  item: DBTCacheItemType;
  item_type: CacheItemTypeEnum;
  uuid: string;
}
