import React from 'react';

import Dashboard from '@components/Dashboard';
import PortalTerminal from '@components/Applications/PortalTerminal';
import PrivateRoute from '@components/shared/PrivateRoute';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { HEADER_HEIGHT } from '@components/ApplicationManager/index.style';

function TerminalPage() {
  return (
    <Dashboard
      title="Terminal"
      uuid="terminal/index"
    >
      <PortalTerminal
        containerRef={null}
        headerOffset={HEADER_HEIGHT}
        onMount={() => true}
        uuid={ApplicationExpansionUUIDEnum.PortalTerminal}

      />
    </Dashboard>
  );
}

TerminalPage.getInitialProps = async () => ({});

export default PrivateRoute(TerminalPage);
