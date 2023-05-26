import Table from '@components/shared/Table';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import UserType from '@interfaces/UserType';
import WorkspaceType from '@interfaces/WorkspaceType';
import Text from '@oracle/elements/Text';
import React, { useMemo, useState } from 'react';
import api from '@api';
import Select from '@oracle/elements/Inputs/Select';
import { find } from '@utils/array';
import RoleType from '@interfaces/RoleType';
import Button from '@oracle/elements/Button';
import { useMutation } from 'react-query';
import { onSuccess } from '@api/utils/response';
import { toast } from 'react-toastify';
import Spacing from '@oracle/elements/Spacing';

type UserWorkspacesEditProps = {
  user: UserType;
  workspaces: WorkspaceType[];
};

function UserWorkspacesEdit({
  user,
  workspaces,
}: UserWorkspacesEditProps) {
  const [profile, setProfile] = useState<UserType>(user);

  const workspaceEntityIDs = workspaces?.map(({ repo_path }) => repo_path);
  const { data: dataRoles, mutate: fetchRoles } = api.roles.list({
    entity: 'project',
    entity_ids: workspaceEntityIDs,
  }, {}, {});

  const rolesByWorkspace = useMemo(() => {
    const roles = dataRoles?.roles || [];

    return roles?.reduce(
      (obj, role) => {
        const repoPath = role.permissions[0].entity_id;

        // const name = repoPath.split('/').slice(-1)
        const existingRoles = obj[repoPath] || [];
        return {
          ...obj,
          [repoPath]: [...existingRoles, role],
        };
      },
      {},
    );
  }, [dataRoles]);

  console.log(rolesByWorkspace);

  const userRoleByWorkspace = useMemo(() => {
    const roles = user?.roles_new;
    console.log('roles:', roles);
    return roles?.reduce(
      (obj, role) => {
        const repoPath = role?.permissions?.[0].entity_id;

        // const name = repoPath.split('/').slice(-1)
        return {
          ...obj,
          [repoPath]: role,
        };
      },
      {},
    );
  }, [user]);

  const [updateUser, { isLoading }] = useMutation(
    api.users.useUpdate(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            user: userServer,
          }) => {
            toast.success(
              'User roles successfully updated.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `user-update-success-${userServer.id}`,
              },
            );
          },
          onErrorCallback: ({
            error: {
              errors,
              exception,
              message,
              type,
            },
          }) => {
            toast.error(
              errors?.error || exception || message,
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: type,
              },
            );
          },
        },
      ),
    },
  );

  console.log('userRoleByWorkspace:', userRoleByWorkspace);

  return (
    <>
      <Table
        columnFlex={[1, 1]}
        columns={[
          {
            uuid: 'Workspace',
          },
          {
            uuid: 'Role',
          },
        ]}
        rows={workspaces?.map(({
          name,
          repo_path,
        }: WorkspaceType) => {
          const roles = rolesByWorkspace?.[repo_path] || [];
          const userRole = userRoleByWorkspace?.[repo_path];
          return [
            <Text bold key="name">
              {name}
            </Text>,
            <Select
              key="project_role"
              // label="Roles"
              // @ts-ignore
              onChange={e => {
                // setButtonDisabled(false);
                const newRole = find(roles, (({ id }: RoleType) => id == e.target.value));
                if (newRole) {
                  setProfile(prev => {
                    const prevRoles = prev?.roles_new?.filter(role => role.id == userRole?.id) || [];
                    const updatedProfile: UserType = {
                      roles_new: [...prevRoles, newRole],
                    };
                    return ({
                      ...prev,
                      ...updatedProfile,
                    });
                  });
                }
              }}
              placeholder="No access"
              primary
              setContentOnMount
              value={userRole?.id}
            >
              {roles.map(({ id, name }) => (
                <option key={name} value={id}>
                  {name}
                </option>
              ))}
            </Select>,
          ];
        })}
      />
      <Spacing p={2}>
        <Button
          // disabled={buttonDisabled || (errors && !isEmptyObject(errors))}
          loading={isLoading}
          onClick={() => {
            const updated_profile = {
              ...profile,
              roles_new: profile.roles_new?.map(({ id }: RoleType) => id),
            };
            // @ts-ignore
            updateUser({ user: updated_profile });
          }}
          primary
        >
          Update roles
        </Button>
      </Spacing>
    </>
  );
}

export default UserWorkspacesEdit;
