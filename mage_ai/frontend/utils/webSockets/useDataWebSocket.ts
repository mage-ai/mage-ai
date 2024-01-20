import useWebSocket from 'react-use-websocket';

import AuthToken from '@api/utils/AuthToken';
import KernelOutputType, { RawEventOutputDataType, ExecutionStateEnum, ExecutionStatusEnum, GroupOfOutputsType, MsgType } from '@interfaces/KernelOutputType';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { getUser } from '@utils/session';
import { getWebSocket } from '@api/utils/url';

export default function useDataWebSocket({
  onMessage,
  onOpen,
  onRenderOutputCallback,
  onRenderOutputFocusedCallback,
  shouldConnect,
  shouldReconnect,
  uuid,
}: {
  onMessage?: (message: KernelOutputType, opts?: {
    executionState: ExecutionStateEnum;
    executionStatus: ExecutionStatusEnum;
  }) => void;
  onOpen?: (value: boolean) => void;
  onRenderOutputCallback?: () => void;
  onRenderOutputFocusedCallback?: () => void;
  shouldConnect?: boolean;
  shouldReconnect?: (event: any) => boolean;
  uuid: string;
}): {

} {
  const {
    lastMessage,
    readyState,
    sendMessage: sendMessageInit,
  } = useWebSocket(getWebSocket(`${uuid}-${user?.id}`), {
    heartbeat: {
      message: 'ping',
      returnMessage: 'pong',
      timeout: 60000,
      interval: 25000,
    },
    shouldReconnect: (data) => {
      if (shouldReconnect) {
        return shouldReconnect?.(data)
      } else {
        return true;
      }
    },
    onOpen: () => onOpen && onOpen?.(true),
    onMessage: (messageEvent: RawEventOutputDataType) => {
      if (onMessage) {
        onMessage?.(messageEvent);
      }
    },
  }, shouldConnect && !!uuid);


  const sendMessage = useCallback((payload: {
    [key: string]: any;
  }) => {
    return sendMessageInit(JSON.stringify({
      ...oauthWebsocketData,
      ...payload,
    }))
  }, [oauthWebsocketData, sendMessageInit]);

  return {

  };
}

