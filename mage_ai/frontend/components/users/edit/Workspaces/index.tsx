import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import RoleType from '@interfaces/RoleType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import UserType from '@interfaces/UserType';
import WorkspaceType from '@interfaces/WorkspaceType';
import api from '@api';
import { find } from '@utils/array';
import { onSuccess } from '@api/utils/response';

type UserWorkspacesEditProps = {
  fetchUser: () => void;
  newUser?: boolean;
  user: UserType;
  workspaces: WorkspaceType[];
};

function UserWorkspacesEdit({
  fetchUser,
  user,
  workspaces,
}: UserWorkspacesEditProps) {
  const [profile, setProfile] = useState<UserType>();

  useEffect(() => {
    if (user) {
      setProfile(user);
    }
  }, [user]);

  const workspaceEntityIDs = workspaces?.map(({ project_uuid }: WorkspaceType) => project_uuid);
  const { data: dataRoles, mutate: fetchRoles } = api.roles.list({
    entity: 'project',
    entity_ids: workspaceEntityIDs,
  }, {}, {});

  const rolesByWorkspace = useMemo(() => {
    const roles = dataRoles?.roles || [];

    return roles?.reduce(
      (obj, role) => {
        const projectUUID = role.permissions[0].entity_id;
        const existingRoles = obj[projectUUID] || [];
        return {
          ...obj,
          [projectUUID]: [...existingRoles, role],
        };
      },
      {},
    );
  }, [dataRoles]);

  const userRoleByWorkspace = useMemo(() => {
    const u = profile ? profile : user;
    const roles = u?.roles_new;
    return roles?.reduce(
      (obj, role) => {
        const projectUUID = role?.permissions?.[0]?.entity_id;
        return {
          ...obj,
          [projectUUID]: role,
        };
      },
      {},
    );
  }, [profile, user]);

  const [updateUser, { isLoading }] = useMutation(
    api.users.useUpdate(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            user: userServer,
          }) => {
            toast.success(
              'User roles successfully saved.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `user-update-success-${userServer.id}`,
              },
            );
            fetchUser();
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
          project_uuid,
        }: WorkspaceType) => {
          const roles = rolesByWorkspace?.[project_uuid] || [];
          const userRole = userRoleByWorkspace?.[project_uuid];
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
                    const prevRoles = prev?.roles_new?.filter(role => role.id != newRole?.id) || [];
                    console.log('prev roles:', prevRoles);
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
          loading={isLoading}
          onClick={() => {
            const updated_profile = {
              ...profile,
              roles_new: profile?.roles_new?.map(({ id }: RoleType) => id),
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
