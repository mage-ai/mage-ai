import { indexBy } from '@utils/array';

export enum ProviderEventTypeEnum {
  AWS = 'aws_event',
}

export const PROVIDER_EVENTS: {
  label: () => string;
  uuid: ProviderEventTypeEnum;
}[] = [
  {
    label: () => 'AWS',
    uuid: ProviderEventTypeEnum.AWS,
  },
];

export const PROVIDER_EVENTS_BY_UUID = indexBy(PROVIDER_EVENTS, ({ uuid }) => uuid);

export default interface EventMatcherType {
  event_type: ProviderEventTypeEnum;
  id: string | number;
  name: string;
  pattern: {
    [key: string]: string;
  };
  pipeline_schedule_ids: number[];
}
