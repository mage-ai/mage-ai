export enum ExecutionStateEnum {
  IDLE = 'idle',
}

export enum DataTypeEnum {
  IMAGE_PNG = 'image/png',
  TEXT = 'text',
  TEXT_PLAIN = 'text/plain',
}

export default interface KernelOutputType {
  data?: string;
  execution_state: ExecutionStateEnum;
  metadata?: {
    [key: string]: string;
  };
  type: DataTypeEnum;
}
