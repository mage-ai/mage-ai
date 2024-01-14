import React from 'react';

import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import PortalTerminal from '@components/Applications/PortalTerminal';
import { HEADER_HEIGHT } from '@components/ApplicationManager/index.style';

function TerminalPage() {
  return (
    <Dashboard
      title="Terminal"
      uuid="terminal/index"
    >
      <PortalTerminal
        headerOffset={HEADER_HEIGHT}
      />
    </Dashboard>
  );
}

TerminalPage.getInitialProps = async () => ({});

export default PrivateRoute(TerminalPage);
