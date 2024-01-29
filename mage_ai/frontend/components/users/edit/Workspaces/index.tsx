import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Chip from '@oracle/components/Chip';
import FlexContainer from '@oracle/components/FlexContainer';
import PermissionType from '@interfaces/PermissionType';
import RoleType from '@interfaces/RoleType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import UserType from '@interfaces/UserType';
import WorkspaceType from '@interfaces/WorkspaceType';
import api from '@api';
import { find, remove } from '@utils/array';
import { onSuccess } from '@api/utils/response';

type UserWorkspacesEditProps = {
  fetchUser: () => void;
  user: UserType;
  workspaces: WorkspaceType[];
};

function UserWorkspacesEdit({
  fetchUser,
  user,
  workspaces,
}: UserWorkspacesEditProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserType>();
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(true);

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

  const groupRolesByWorkspace = useCallback((roles: RoleType[]) => roles?.reduce(
    (obj, role) => {
      let updatedObj = obj;
      role?.permissions?.forEach(({ entity_id }: PermissionType) => {
        const projectUUID = entity_id;

        const existingRoles = updatedObj[projectUUID] || [];

        updatedObj = {
          ...updatedObj,
          [projectUUID]: [...existingRoles, role],
        };
      });
      return updatedObj;
    },
    {},
  ), []);

  const rolesByWorkspace = useMemo(() => {
    const roles = dataRoles?.roles || [];

    return groupRolesByWorkspace(roles);
  }, [dataRoles, groupRolesByWorkspace]);

  const userRolesByWorkspace = useMemo(() => {
    const u = profile ? profile : user;
    const roles = u?.roles_new;
    return groupRolesByWorkspace(roles);
  }, [groupRolesByWorkspace, profile, user]);

  const [updateUser, { isLoading }] = useMutation(
    api.users.useUpdate(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            router.push('/manage/users');
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
      <Spacing p={2}>
        <Button
          disabled={buttonDisabled}
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
          Update workspace roles
        </Button>
      </Spacing>
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
          const userRoles = userRolesByWorkspace?.[project_uuid];
          return [
            <Text bold key="name">
              {name}
            </Text>,
            <>
              <Select
                key="project_role"
                label="Roles"
                // @ts-ignore
                onChange={e => {
                  setButtonDisabled(false);
                  const newRole = find(roles, (({ id }: RoleType) => id == e.target.value));
                  if (newRole) {
                    setProfile(prev => {
                      const prevRoles = prev?.roles_new?.filter(role => role.id != newRole?.id) || [];
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
                primary
                setContentOnMount
              >
                {roles.map(({ id, name }) => (
                  <option key={name} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
              <Spacing mb={1} />
              <FlexContainer alignItems="center" flexWrap="wrap">
                {userRoles?.map(({ id, name }: RoleType) => (
                  <Spacing
                    key={`user_roles/${name}`}
                    mb={1}
                    mr={1}
                  >
                    <Chip
                      label={name}
                      onClick={() => {
                        setButtonDisabled(false);
                        setProfile(prev => ({
                          ...prev,
                          roles_new: remove(
                            userRoles,
                            ({ id: rid }: RoleType) => rid === id,
                          ),
                        }));
                      }}
                      primary
                    />
                  </Spacing>
                ))}
              </FlexContainer>
            </>,
          ];
        })}
      />
    </>
  );
}

export default UserWorkspacesEdit;
