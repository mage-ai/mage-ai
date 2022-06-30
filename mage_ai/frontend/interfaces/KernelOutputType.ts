export enum ExecutionStateEnum {
  IDLE = 'idle',
}

export enum DataTypeEnum {
  IMAGE_PNG = 'image/png',
  TABLE = 'table',
  TEXT = 'text',
  TEXT_PLAIN = 'text/plain',
}

export default interface KernelOutputType {
  data?: string | string[];
  execution_state: ExecutionStateEnum;
  metadata?: {
    [key: string]: string;
  };
  type: DataTypeEnum;
}
