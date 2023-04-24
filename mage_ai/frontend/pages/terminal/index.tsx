import React, { useCallback, useMemo } from 'react';
import useWebSocket from 'react-use-websocket';
import { useMutation } from 'react-query';

import AuthToken from '@api/utils/AuthToken';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import Terminal from '@components/Terminal';
import api from '@api';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { PipelineTypeEnum, PIPELINE_TYPE_TO_KERNEL_NAME } from '@interfaces/PipelineType';
import { getWebSocket } from '@api/utils/url';
import { onSuccess } from '@api/utils/response';

function TerminalPage() {
  const token = useMemo(() => new AuthToken(), []);
  const sharedWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  const {
    lastMessage,
    sendMessage,
  } = useWebSocket(getWebSocket('terminal'), {
    shouldReconnect: () => true,
    queryParams: sharedWebsocketData,
  });

  return (
    <Dashboard
      title="Terminal"
      uuid="terminal/index"
    >
      <Terminal
        lastMessage={lastMessage}
        sendMessage={sendMessage}
      />
    </Dashboard>
  );
}

TerminalPage.getInitialProps = async () => ({});

export default PrivateRoute(TerminalPage);
