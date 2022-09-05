export enum ProviderEventTypeEnum {
  AWS = 'aws_event',
};

export default interface EventMatcherType {
  event_type: ProviderEventTypeEnum;
  name: string;
  pattern: {
    [key: string]: string;
  };
  pipeline_schedule_ids: number[];
}
