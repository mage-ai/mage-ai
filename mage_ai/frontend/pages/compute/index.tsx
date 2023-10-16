import PrivateRoute from '@components/shared/PrivateRoute';
import Dashboard from '@components/Dashboard';
import ComputeManagement from '@components/ComputeManagement';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';

function ComputeManagementPage() {
  return (
    <Dashboard
      title="Compute management"
      uuid="Compute management/index"
    >
      <ComputeManagement
        heightOffset={HEADER_HEIGHT}
      />
    </Dashboard>
  );
}

ComputeManagementPage.getInitialProps = async () => ({});

export default PrivateRoute(ComputeManagementPage);
