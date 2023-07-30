export enum GlobalDataProductObjectTypeEnum {
  BLOCK = 'block',
  PIPELINE = 'pipeline',
}

export default interface GlobalDataProductType {
  object_type?: GlobalDataProductObjectTypeEnum;
  object_uuid?: string;
  outdated_after?: {
    months?: number;
    seconds?: number;
    weeks?: number;
    years?: number;
  };
  outdated_starting_at?: {
    day_of_month?: number;
    day_of_week?: number;
    day_of_year?: number;
    hour_of_day?: number;
    minute_of_hour?: number;
    month_of_year?: number;
    second_of_minute?: number;
    week_of_month?: number;
    week_of_year?: number;
  };
  settings?: {
    [block_uuid: string]: {
      partitions?: number;
    };
  };
  uuid: string;
}
