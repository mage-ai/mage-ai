export default interface ActionPayloadType {
  action_arguments?: any;
  action_code?: string;
  action_options?: any;
  action_type: string;
  action_variables?: any;
  axis: string;
  metadata?: any;
  outputs?: any[];
  priority?: number;
  status?: string;
}
