import React, { useState } from 'react';

import ErrorsType from '@interfaces/ErrorsType';
import PrivateRoute from '@components/shared/PrivateRoute';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import FileEditor from '@components/FileEditor';

function SettingsPage() {
  const [errors, setErrors] = useState<ErrorsType>(null);

  return (
    <WorkspacesDashboard
      breadcrumbs={[
        {
          label: () => 'Workspaces',
          linkProps: {
            as: '/manage',
            href: '/manage',
          },
        },
        {
          bold: true,
          label: () => 'Settings',
        },
      ]}
      errors={errors}
      pageName={WorkspacesPageNameEnum.SETTINGS}
    >
      <FileEditor
        active
        filePath="metadata.yaml"
        selectedFilePath="metadata.yaml"
        setFilesTouched={() => null}
      />
    </WorkspacesDashboard>
  );
}

SettingsPage.getInitialProps = async () => ({});

export default PrivateRoute(SettingsPage);
