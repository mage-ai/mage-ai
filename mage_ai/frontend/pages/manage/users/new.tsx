import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import UserEditForm from '@components/users/edit/Form';
import UserWorkspacesEdit from '@components/users/edit/Workspaces';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { USER_PASSWORD_CURRENT_FIELD_UUID } from '@components/users/edit/Form/constants';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import { queryFromUrl } from '@utils/url';
import usePrevious from '@utils/usePrevious';
import { isEqual } from '@utils/hash';

function ManageNewUser() {
  const router = useRouter();

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
          label: () => 'Users',
          linkProps: {
            as: '/manage/users',
            href: '/manage/users',
          },
        },
        {
          bold: true,
          label: () => 'New',
        },
      ]}
      pageName={WorkspacesPageNameEnum.USERS}
    >
      <Spacing p={PADDING_UNITS}>
        <UserEditForm
          hideFields={['roles']}
          newUser
          onSaveSuccess={(user) => {
            router.push(
              '/manage/users/[user]',
              `/manage/users/${user?.id}`,
            );
          }}
          title="Add new user"
          user={{}}
        />
      </Spacing>
    </WorkspacesDashboard>
  );
}

ManageNewUser.getInitialProps = async (ctx: any) => ({});


export default PrivateRoute(ManageNewUser);
