import React from 'react';

import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import useTerminal from '@components/Terminal/useTerminal';

function TerminalPage() {
  const {
    tabs,
    terminal,
  } = useTerminal({
    uuid: 'Pages/TerminalPage',
  });

  return (
    <Dashboard
      title="Terminal"
      uuid="terminal/index"
    >
      {terminal}
    </Dashboard>
  );
}

TerminalPage.getInitialProps = async () => ({});

export default PrivateRoute(TerminalPage);
