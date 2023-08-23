import React, { useMemo } from 'react';
import useWebSocket from 'react-use-websocket';

import AuthToken from '@api/utils/AuthToken';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import Terminal from '@components/Terminal';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { getWebSocket } from '@api/utils/url';

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
    protocols: [OAUTH2_APPLICATION_CLIENT_ID, token.decodedToken.token],
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
