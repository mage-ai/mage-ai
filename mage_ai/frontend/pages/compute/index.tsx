import { useRef } from 'react';

import ComputeManagement from '@components/ComputeManagement';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';

function ComputeManagementPage() {
  const mainContainerRef = useRef(null);

  return (
    <Dashboard
      title="Compute management"
      uuid="Compute management/index"
    >
      <div ref={mainContainerRef}>
        <ComputeManagement
          heightOffset={HEADER_HEIGHT}
          mainContainerRef={mainContainerRef}
        />
      </div>
    </Dashboard>
  );
}

ComputeManagementPage.getInitialProps = async () => ({});

export default PrivateRoute(ComputeManagementPage);
