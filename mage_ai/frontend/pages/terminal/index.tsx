import React from 'react';

import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import PortalTerminal from '@components/Applications/PortalTerminal';

function TerminalPage() {
  return (
    <Dashboard
      title="Terminal"
      uuid="terminal/index"
    >
      <PortalTerminal />
    </Dashboard>
  );
}

TerminalPage.getInitialProps = async () => ({});

export default PrivateRoute(TerminalPage);
