export enum ExecutionStateEnum {
  BUSY = 'busy', // Code is being executed
  IDLE = 'idle', // Nothing is being done
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
