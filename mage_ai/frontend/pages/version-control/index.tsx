import Dashboard from '@components/Dashboard';
import GitActions from '@components/VersionControl/GitActions';
import PrivateRoute from '@components/shared/PrivateRoute';
import React from 'react';

function VersionControlPage() {
  return (
    <Dashboard
      title="Version Control"
      uuid="version_control/index"
    >
      <GitActions />
    </Dashboard>
  );
}

VersionControlPage.getInitialProps = async () => ({});

export default PrivateRoute(VersionControlPage);
