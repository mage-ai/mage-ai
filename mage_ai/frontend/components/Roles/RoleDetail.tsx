import { toast } from 'react-toastify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import PermissionType from '@interfaces/PermissionType';
import RoleType, { UserType } from '@interfaces/RoleType';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { ContainerStyle } from '@components/shared/index.style';
import {
  Add,
  Alphabet,
  Edit,
  Locked,
  Save,
  Schedule,
  Trash,
  UserSmileyFace,
} from '@oracle/icons';
import {
  PADDING_UNITS,
  UNIT,
  UNITS_BETWEEN_ITEMS_IN_SECTIONS,
  UNITS_BETWEEN_SECTIONS,
} from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum } from '@components/settings/Dashboard/constants';
import { dateFormatLong } from '@utils/date';
import { displayName } from '@utils/models/user';
import { displayNames } from '@utils/models/permission';
import { indexBy, sortByKey } from '@utils/array';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

const ICON_SIZE = 2 * UNIT;

enum ObjectTypeEnum {
  PERMISSIONS = 'Permissions',
  USERS = 'Users',
}

type ObjectAttributesType = {
  created_at?: string;
  name?: string;
  permissionsMapping?: {
    [id: number]: PermissionType;
  };
  usersMapping?: {
    [id: number]: UserType;
  };
  updated_at?: string;
};

type RoleDetailProps = {
  contained?: boolean;
  onCancel?: () => void;
  slug?: number | string;
};

function RoleDetail({
  contained,
  onCancel,
  slug,
}: RoleDetailProps) {
  const router = useRouter();

  const [afterHidden, setAfterHidden] = useState(true);
  const [addingObjectType, setAddingObjectType] = useState(null);
  const [attributesTouched, setAttributesTouched] = useState<ObjectAttributesType>({});
  const [objectAttributes, setObjectAttributesState] = useState<ObjectAttributesType>(null);

  const setObjectAttributesStateWithMapping = useCallback((
    data,
    permissionsArray,
    usersArray,
  ) => {
    setObjectAttributesState({
      ...data,
      permissionsMapping: indexBy(permissionsArray || [], ({ id }) => id),
      usersMapping: indexBy(usersArray || [], ({ id }) => id),
    });
  }, [
    setObjectAttributesState,
  ]);

  const setObjectAttributes = useCallback((data) => {
    setAttributesTouched(prev => ({
      ...prev,
      ...data,
    }));
    setObjectAttributesState((prev) => ({
      ...prev,
      ...data,
    }));
  }, [
    setAttributesTouched,
    setObjectAttributesState,
  ]);

  const { data } = api.roles.detail(slug, {}, {
    revalidateOnFocus: false,
  });
  const role = useMemo(() => data?.role, [data]);

  useEffect(() => {
    if (role) {
      setObjectAttributesStateWithMapping(
        role,
        role?.role_permissions,
        role?.users,
      );
    }
  }, [
    setObjectAttributesStateWithMapping,
    role,
  ]);

  const [mutateObject, { isLoading: isLoadingMutateObject }] = useMutation(
    role ? api.roles.useUpdate(role?.id) : api.roles.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            role: objectServer,
          }) => {
            setAttributesTouched({});
            setObjectAttributesStateWithMapping(
              objectServer,
              objectServer?.role_permissions,
              objectServer?.users
            );

            if (!role) {
              router.push(`/settings/workspace/roles/${objectServer?.id}`);
            }

            toast.success(
              role ? 'Role successfully updated.' : 'New role created successfully.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `role-mutate-success-${objectServer.id}`,
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
  const [deleteObject, { isLoading: isLoadingDeleteObject }] = useMutation(
    api.roles.useDelete(role?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            router.push('/settings/workspace/roles');

            toast.success(
              'Role successfully delete.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `role-delete-success-${role?.id}`,
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

  const { data: dataPermissions } = api.permissions.list({
    _limit: 1000,
  }, {}, {
    pauseFetch: !role,
  });
  const permissionsAll: PermissionType[] = useMemo(() => sortByKey(
    dataPermissions?.permissions || [],
    'entity_name',
  ), [
    dataPermissions,
  ]);
  const permissionsMapping = useMemo(() => objectAttributes?.permissionsMapping || {}, [
    objectAttributes,
  ]);
  const permissions: PermissionType[] = useMemo(() => sortByKey(
    Object.values(permissionsMapping),
    'entity_name',
  ), [
    permissionsMapping,
  ]);

  const { data: dataUsers } = api.users.list({}, {}, {
    pauseFetch: !role,
  });
  const usersAll: UserType[] = useMemo(() => sortByKey(
    dataUsers?.users || [],
    user => displayName(user),
  ), [
    dataUsers,
  ]);
  const usersMapping = useMemo(() => objectAttributes?.usersMapping || {}, [
    objectAttributes,
  ]);
  const users: UserType[] = useMemo(() => sortByKey(
    Object.values(usersMapping),
    user => displayName(user),
  ), [
    usersMapping,
  ]);

  const hasPermissions = useMemo(() => permissions?.length >= 1, [permissions]);
  const addPermissionButton = useMemo(() => (
    <Button
      beforeIcon={<Add />}
      compact
      onClick={() => {
        setAddingObjectType(ObjectTypeEnum.PERMISSIONS);
        setAfterHidden(false);
      }}
      primary={!hasPermissions}
      secondary={hasPermissions}
      small
    >
      Add permission
    </Button>
  ), [
    hasPermissions,
    setAddingObjectType,
    setAfterHidden,
  ]);

  const hasUsers = useMemo(() => users?.length >= 1, [users]);
  const addUserButton = useMemo(() => (
    <Button
      beforeIcon={<Add />}
      compact
      onClick={() => {
        setAddingObjectType(ObjectTypeEnum.USERS);
        setAfterHidden(false);
      }}
      primary={!hasUsers}
      secondary={hasUsers}
      small
    >
      Add user
    </Button>
  ), [
    hasUsers,
  ]);

  const buildTable = useCallback((
    permissionsArray: PermissionType[],
    enableClickRow?: boolean,
  ) => (
    <Table
      columnFlex={[null, null, 2, 1, 1, 6]}
      columns={[
        {
          label: () => {
            const checked = permissionsArray?.every(({ id }) => permissionsMapping?.[id]);

            return (
              <Checkbox
                checked={checked}
                key="checkbox"
                onClick={(e) => {
                  pauseEvent(e);

                  if (checked) {
                    setObjectAttributes({
                      permissionsMapping: {},
                    });
                  } else {
                    setObjectAttributes({
                      permissionsMapping: indexBy(permissionsArray, ({ id }) => id),
                    });
                  }
                }}
              />
            );
          },
          uuid: 'actions',
        },
        {
          uuid: 'ID',
        },
        {
          uuid: 'Entity',
        },
        {
          uuid: 'Subtype',
        },
        {
          uuid: 'Entity ID',
        },
        {
          rightAligned: true,
          uuid: 'Access',
        },
      ]}
      onClickRow={enableClickRow
        ? (rowIndex: number) => {
          const object = permissionsArray[rowIndex];
          if (object && typeof window !== 'undefined') {
            window.open(`/settings/workspace/permissions/${object?.id}`, '_blank').focus();
          }
        }
        : null
      }
      rows={permissionsArray?.map((permission) => {
        const {
          access,
          entity,
          entity_id: entityID,
          entity_name: entityName,
          entity_type: entityType,
          id,
        } = permission;
        const accessDisplayNames = access ? displayNames(access) : [];
        const accessDisplayNamesCount = accessDisplayNames?.length || 0;
        const checked = !!permissionsMapping?.[id];

        return [
          <Checkbox
            checked={checked}
            key="checkbox"
            onClick={(e) => {
              pauseEvent(e);

              const mapping = { ...permissionsMapping };

              if (checked) {
                delete mapping?.[id];
              } else {
                mapping[id] = permission;
              }

              setObjectAttributes({
                permissionsMapping: mapping,
              });
            }}
          />,
          <Text default key="id" monospace>
            {id}
          </Text>,
          <Text key="entityName" monospace>
            {entityName || entity}
          </Text>,
          <Text default key="entityType" monospace={!!entityType}>
            {entityType || '-'}
          </Text>,
          <Text default key="entityID" monospace={!!entityID}>
            {entityID || '-'}
          </Text>,
          <div key="access">
            {accessDisplayNamesCount >= 1 && (
              <FlexContainer alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                {accessDisplayNames?.map((displayName: string, idx: number) => (
                  <div key={displayName}>
                    <Text default monospace small>
                      {displayName}{accessDisplayNamesCount >= 2
                        && idx < accessDisplayNamesCount - 1
                        && (
                          <Text inline muted small>
                            ,&nbsp;
                          </Text>
                        )
                      }
                    </Text>
                  </div>
                ))}
              </FlexContainer>
            )}
          </div>,
        ];
      })}
      uuid="permissions"
    />
  ), [
    permissionsMapping,
    setObjectAttributes,
  ]);

  const buildTableUsers = useCallback((
    objectArray: UserType[],
    enableClickRow?: boolean,
  ) => (
    <Table
      columnFlex={[null, 1, 1, 1]}
      columns={[
        {
          label: () => {
            const checked = objectArray?.every(({ id }) => usersMapping?.[id]);

            return (
              <Checkbox
                checked={checked}
                key="checkbox"
                onClick={(e) => {
                  pauseEvent(e);

                  if (checked) {
                    setObjectAttributes({
                      usersMapping: {},
                    });
                  } else {
                    setObjectAttributes({
                      usersMapping: indexBy(objectArray, ({ id }) => id),
                    });
                  }
                }}
              />
            );
          },
          uuid: 'actions',
        },
        {
          uuid: 'Username',
        },
        {
          uuid: 'First name',
        },
        {
          uuid: 'Last name',
        },
      ]}
      onClickRow={enableClickRow
        ? (rowIndex: number) => {
          const object = objectArray[rowIndex];
          if (object && typeof window !== 'undefined') {
            window.open(`/settings/workspace/users/${object?.id}`, '_blank').focus();
          }
        }
        : null
      }
      rows={objectArray?.map((object) => {
        const {
          first_name: firstName,
          id,
          last_name: lastName,
          username,
        } = object;
        const checked = !!usersMapping?.[id];

        return [
          <Checkbox
            checked={checked}
            key="checkbox"
            onClick={(e) => {
              pauseEvent(e);

              const mapping = { ...usersMapping };

              if (checked) {
                delete mapping?.[id];
              } else {
                mapping[id] = object;
              }

              setObjectAttributes({
                usersMapping: mapping,
              });
            }}
          />,
          <Text key="username">
            {username}
          </Text>,
          <Text default key="firstName">
            {firstName}
          </Text>,
          <Text default key="lastName">
            {lastName}
          </Text>,
        ];
      })}
      uuid="users"
    />
  ), [
    usersMapping,
    setObjectAttributes,
  ]);

  const afterPermissions = useMemo(() => buildTable(permissionsAll), [
    buildTable,
    permissionsAll,
  ]);

  const afterUsers = useMemo(() => buildTableUsers(usersAll), [
    buildTableUsers,
    usersAll,
  ]);

  const permissionsMemo = useMemo(() => buildTable(permissions, true), [
    buildTable,
    permissions,
  ]);

  const usersMemo = useMemo(() => buildTableUsers(users, true), [
    buildTableUsers,
    users,
  ]);

  const contentMemo = (
    <ContainerStyle>
      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <Headline level={4}>
            Role
          </Headline>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              danger={'name' in attributesTouched && !objectAttributes?.name}
              default
              large
            >
              Name {'name' in attributesTouched && !objectAttributes?.name && (
                <Text danger inline large>
                  is required
                </Text>
              )}
            </Text>

            <Spacing mr={PADDING_UNITS} />

            <Flex flex={1}>
              <TextInput
                afterIcon={<Edit />}
                afterIconClick={(_, inputRef) => {
                  inputRef?.current?.focus();
                }}
                afterIconSize={ICON_SIZE}
                alignRight
                autoComplete="off"
                large
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributes({
                  name: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. Archmage"
                value={objectAttributes?.name || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      {role && (
        <>
          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <Headline level={4}>
                  Permissions
                </Headline>

                <Spacing mr={PADDING_UNITS} />

                {hasPermissions && (
                  <FlexContainer alignItems="center">
                    {addPermissionButton}
                  </FlexContainer>
                )}
              </FlexContainer>
            </Spacing>

            <Divider light />

            {!hasPermissions && (
              <Spacing p={PADDING_UNITS}>
                <Spacing mb={PADDING_UNITS}>
                  <Text default>
                    This role currently has no permissions attached.
                  </Text>
                </Spacing>

                <FlexContainer alignItems="center">
                  {addPermissionButton}
                </FlexContainer>
              </Spacing>
            )}

            {hasPermissions && (
              <Spacing pb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
                {permissionsMemo}
              </Spacing>
            )}
          </Panel>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />

          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <Headline level={4}>
                  Users
                </Headline>

                <Spacing mr={PADDING_UNITS} />

                {hasUsers && (
                  <FlexContainer alignItems="center">
                    {addUserButton}
                  </FlexContainer>
                )}
              </FlexContainer>
            </Spacing>

            <Divider light />

            {!hasUsers && (
              <Spacing p={PADDING_UNITS}>
                <Spacing mb={PADDING_UNITS}>
                  <Text default>
                    There are currently no users with this role.
                  </Text>
                </Spacing>

                <FlexContainer alignItems="center">
                  {addUserButton}
                </FlexContainer>
              </Spacing>
            )}

            {hasUsers && (
              <Spacing pb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
                {usersMemo}
              </Spacing>
            )}
          </Panel>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />

          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <Headline level={4}>
                Metadata
              </Headline>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <Text default large>
                  Last updated
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Flex
                  alignItems="center"
                  flex={1}
                  justifyContent="flex-end"
                >
                  <Text large monospace muted>
                    {objectAttributes?.updated_at && dateFormatLong(objectAttributes?.updated_at, {
                      includeSeconds: true,
                    })}
                  </Text>

                  <Spacing mr={PADDING_UNITS} />

                  <Schedule muted size={ICON_SIZE} />

                  <Spacing mr={1} />
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <Text default large>
                  Created at
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Flex
                  alignItems="center"
                  flex={1}
                  justifyContent="flex-end"
                >
                  <Text large monospace muted>
                    {objectAttributes?.created_at && dateFormatLong(objectAttributes?.created_at, {
                      includeSeconds: true,
                    })}
                  </Text>

                  <Spacing mr={PADDING_UNITS} />

                  <Schedule muted size={ICON_SIZE} />

                  <Spacing mr={1} />
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <Text default large>
                  Created by
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Flex
                  alignItems="center"
                  flex={1}
                  justifyContent="flex-end"
                >
                  <Text large monospace muted>
                    {displayName(role?.user)}
                  </Text>

                  <Spacing mr={PADDING_UNITS} />

                  <UserSmileyFace muted size={ICON_SIZE} />

                  <Spacing mr={1} />
                </Flex>
              </FlexContainer>
            </Spacing>
          </Panel>

          <Spacing mb={UNITS_BETWEEN_SECTIONS} />
        </>
      )}

      <FlexContainer>
        <Button
          beforeIcon={<Save />}
          disabled={!attributesTouched || !Object.keys(attributesTouched)?.length}
          loading={isLoadingMutateObject}
          // @ts-ignore
          onClick={() => mutateObject({
            role: {
              ...selectKeys(objectAttributes, [
                'name',
              ], {
                include_blanks: true,
              }),
              permission_ids: Object.keys(
                objectAttributes?.permissionsMapping || {},
              ).map(i => Number(i)),
              user_ids: Object.keys(
                objectAttributes?.usersMapping || {},
              ).map(i => Number(i)),
            },
          })}
          primary
        >
          {role ? 'Save changes' : 'Create new role'}
        </Button>

        {onCancel && (
          <>
            <Spacing mr={PADDING_UNITS} />

            <Button
              onClick={() => onCancel?.()}
              secondary
            >
              Cancel and go back
            </Button>
          </>
        )}

        {role && (
          <>
            <Spacing mr={PADDING_UNITS} />

            <Button
              beforeIcon={<Trash />}
              danger
              loading={isLoadingDeleteObject}
              onClick={() => deleteObject()}
            >
              Delete role
            </Button>
          </>
        )}
      </FlexContainer>
    </ContainerStyle>
  );

  if (contained) {
    return contentMemo;
  }

  return (
    <SettingsDashboard
      after={
        ObjectTypeEnum.PERMISSIONS === addingObjectType
          ? afterPermissions
          : ObjectTypeEnum.USERS === addingObjectType
            ? afterUsers
            : null
      }
      afterHeader={
        <Spacing px={PADDING_UNITS}>
          <Text bold>
            {addingObjectType}
          </Text>
        </Spacing>
      }
      afterHidden={afterHidden}
      afterWidth={60 * UNIT}
      appendBreadcrumbs
      breadcrumbs={[
        {
          label: () => 'Roles',
          linkProps: {
            href: '/settings/workspace/roles'
          },
        },
        {
          bold: true,
          label: () => role?.name,
        },
      ]}
      hideAfterCompletely
      setAfterHidden={setAfterHidden}
      title={role?.name ? `${role?.name} role` : 'New role'}
      uuidItemSelected={SectionItemEnum.ROLES}
      uuidWorkspaceSelected={SectionEnum.USER_MANAGEMENT}
    >
      {role && contentMemo}
    </SettingsDashboard>
  );
}

export default RoleDetail;
