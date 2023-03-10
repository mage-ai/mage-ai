export enum StateEnum {
  ENABLED = 'ENABLED',
}

export default interface EventRuleType {
  description: string;
  event_pattern?: string;
  name: string;
  schedule_expression: string;
  state: StateEnum;
}
