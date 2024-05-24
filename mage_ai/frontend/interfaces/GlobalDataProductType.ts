export enum GlobalDataProductObjectTypeEnum {
  BLOCK = 'block',
  PIPELINE = 'pipeline',
}

export interface GlobalDataProductOutdatedAfterType {
  months?: number;
  seconds?: number;
  weeks?: number;
  years?: number;
}

export interface GlobalDataProductOutdatedStartingAtType {
  day_of_month?: number;
  day_of_week?: number;
  day_of_year?: number;
  hour_of_day?: number;
  minute_of_hour?: number;
  month_of_year?: number;
  second_of_minute?: number;
  week_of_month?: number;
  week_of_year?: number;
}

export default interface GlobalDataProductType {
  object_type?: GlobalDataProductObjectTypeEnum;
  object_uuid?: string;
  outdated_after?: GlobalDataProductOutdatedAfterType;
  outdated_starting_at?: GlobalDataProductOutdatedStartingAtType;
  project?: string;
  repo_path?: string;
  settings?: {
    [block_uuid: string]: {
      partitions?: number;
    };
  };
  uuid?: string;
}
