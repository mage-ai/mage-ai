import React, { useMemo } from 'react';
import useWebSocket from 'react-use-websocket';

import AuthToken from '@api/utils/AuthToken';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import Terminal from '@components/Terminal';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { getWebSocket } from '@api/utils/url';
import { getUser } from '@utils/session';

function TerminalPage() {
  const user = getUser() || {};

  const {
    lastMessage,
    sendMessage,
  } = useWebSocket(getWebSocket('terminal'), {
    queryParams: {
      term_name: user?.id,
    },
    shouldReconnect: () => true,
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
