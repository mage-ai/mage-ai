import React, { useMemo } from 'react';
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

type ManageUserDetailProps = {
  user: { id: number };
};

function ManageUserDetail({
  user: userProp,
}: ManageUserDetailProps) {
  const router = useRouter();

  const userID = userProp?.id;

  const { data: dataUser, mutate: fetchUser } = api.users.detail(userID);
  const user = useMemo(() => dataUser?.user, [dataUser]);

  const { data: dataWorkspaces, mutate: fetchWorkspaces } = api.workspaces.list(
    {
      user_id: userID,
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
    },
  );

  const workspaces = useMemo(() => dataWorkspaces?.workspaces, [dataWorkspaces]);

  return (
    <WorkspacesDashboard
      before={
        <Spacing p={PADDING_UNITS}>
          <UserEditForm
            entity="global"
            entityID={null}
            hideFields={[USER_PASSWORD_CURRENT_FIELD_UUID]}
            onDeleteSuccess={() => router.push('/manage/users')}
            onSaveSuccess={fetchUser}
            showDelete
            title="Edit user"
            user={user}
          />
        </Spacing>
      }
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
          label: () => user?.username || 'User',
        },
      ]}
      pageName={WorkspacesPageNameEnum.USERS}
    >
      <UserWorkspacesEdit
        fetchUser={fetchUser}
        user={user}
        workspaces={workspaces}
      />
    </WorkspacesDashboard>
  );
}

ManageUserDetail.getInitialProps = async (ctx: any) => {
  const { user: userID }: { user: number } = ctx.query;

  return {
    user: {
      id: userID,
    },
  };
};

export default PrivateRoute(ManageUserDetail);
