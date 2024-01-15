import { ReadyState } from 'react-use-websocket';


export enum WebSocketStateEnum {
  CONNECTING = 'CONNECTING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  UNINSTANTIATED = 'UNINSTANTIATED',
}

export const READY_STATE_MAPPING = {
  [ReadyState.CONNECTING]: WebSocketStateEnum.CONNECTING,
  [ReadyState.OPEN]: WebSocketStateEnum.OPEN,
  [ReadyState.CLOSING]: WebSocketStateEnum.CLOSING,
  [ReadyState.CLOSED]: WebSocketStateEnum.CLOSED,
  [ReadyState.UNINSTANTIATED]: WebSocketStateEnum.UNINSTANTIATED,
};

export const DISPLAY_LABEL_MAPPING = {
  [WebSocketStateEnum.CONNECTING]: 'Connecting',
  [WebSocketStateEnum.OPEN]: 'Open',
  [WebSocketStateEnum.CLOSING]: 'Closing',
  [WebSocketStateEnum.CLOSED]: 'Closed',
  [WebSocketStateEnum.UNINSTANTIATED]: 'Uninstantiated',
};
