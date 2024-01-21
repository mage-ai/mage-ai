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
import RoleType from '@interfaces/RoleType';
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
import { getUser, setUser } from '@utils/session';
import { indexBy, sortByKey } from '@utils/array';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

const ICON_SIZE = 2 * UNIT;

export enum ObjectTypeEnum {
  PERMISSIONS = 'Permissions',
  ROLES = 'Roles',
}

type UserAttributesType = {
  avatar?: string;
  created_at?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  password_confirmation?: string;
  password_current?: string;
  permissionsMapping?: {
    [id: number]: PermissionType;
  };
  rolesMapping?: {
    [id: number]: RoleType;
  };
  updated_at?: string;
  username?: string;
};

type UserDetailPageProps = {
  contained?: boolean;
  disableFields?: ObjectTypeEnum[];
  onCancel?: () => void;
  slug?: number | string;
};

function UserDetail({
  contained,
  disableFields,
  onCancel,
  slug,
}: UserDetailPageProps) {
  const {
    id: currentUserID,
    owner: isOwner,
  } = getUser() || {};

  const router = useRouter();

  const [afterHidden, setAfterHidden] = useState(true);
  const [addingObjectType, setAddingObjectType] = useState(null);
  const [attributesTouched, setAttributesTouched] = useState<UserAttributesType>({});
  const [objectAttributes, setObjectAttributesState] = useState<UserAttributesType>(null);

  const setObjectAttributesStateWithMapping = useCallback((
    data,
    rolesArray,
    permissionsArray,
  ) => {
    setObjectAttributesState({
      ...data,
      rolesMapping: indexBy(rolesArray || [], ({ id }) => id),
      permissionsMapping: indexBy(permissionsArray || [], ({ id }) => id),
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

  const { data } = api.users.detail(slug, {}, {
    revalidateOnFocus: false,
  });
  const user = useMemo(() => data?.user, [data]);

  useEffect(() => {
    if (user) {
      setObjectAttributesStateWithMapping(
        user,
        user?.roles_new,
        user?.permissions,
      );
    }
  }, [
    setObjectAttributesStateWithMapping,
    user,
  ]);

  const [mutateObject, { isLoading: isLoadingMutateObject }] = useMutation(
    user ? api.users.useUpdate(slug) : api.users.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            user: objectServer,
          }) => {
            setAttributesTouched({});
            setObjectAttributesStateWithMapping(
              objectServer,
              objectServer?.roles_new,
              objectServer?.permissions,
            );

            if (!user) {
              router.push(`/settings/workspace/users/${objectServer?.id}`);
            }

            if (String(objectServer?.id) === String(currentUserID)) {
              setUser({
                ...getUser(),
                avatar: objectServer?.avatar,
                first_name: objectServer?.first_name,
                last_name: objectServer?.last_name,
                username: objectServer?.username,
              });
            }

            toast.success(
              user ? 'User profile successfully updated.' : 'New user created successfully.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `user-update-success-${objectServer.id}`,
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
    api.users.useDelete(user?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            router.push('/settings/workspace/users');

            toast.success(
              'User successfully delete.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `user-delete-success-${user?.id}`,
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

  const { data: dataRoles } = api.roles.list();
  const rolesAll: RoleType[] = useMemo(() => sortByKey(
    dataRoles?.roles || [],
    'name',
  ), [
    dataRoles,
  ]);
  const rolesMapping = useMemo(() => objectAttributes?.rolesMapping || {}, [
    objectAttributes,
  ]);
  const roles: RoleType[] = useMemo(() => sortByKey(
    Object.values(rolesMapping),
    'name',
  ), [
    rolesMapping,
  ]);

  const { data: dataPermissions } = api.permissions.list({ _limit: 1000 });
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

  const hasRoles = useMemo(() => roles?.length >= 1, [roles]);
  const addRoleButton = useMemo(() => (
    <Button
      beforeIcon={<Add />}
      compact
      onClick={() => {
        setAddingObjectType(ObjectTypeEnum.ROLES);
        setAfterHidden(false);
      }}
      primary={!hasRoles}
      secondary={hasRoles}
      small
    >
      Add roles
    </Button>
  ), [
    hasRoles,
    setAddingObjectType,
    setAfterHidden,
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

  const buildTable = useCallback((
    objectsArray: RoleType[],
    enableClickRow?: boolean,
    disableEdit?: boolean,
  ) => (
    <Table
      columnFlex={[...(disableEdit ? [] : [null]), 1]}
      columns={[
        ...(disableEdit ? [] : [{
          label: () => {
            const checked = objectsArray?.every(({ id }) => rolesMapping?.[id]);

            return (
              <Checkbox
                checked={checked}
                key="checkbox"
                onClick={(e) => {
                  pauseEvent(e);

                  if (checked) {
                    setObjectAttributes({
                      rolesMapping: {},
                    });
                  } else {
                    setObjectAttributes({
                      rolesMapping: indexBy(objectsArray, ({ id }) => id),
                    });
                  }
                }}
              />
            );
          },
          uuid: 'actions',
        }]),
        {
          uuid: 'Role',
        },
      ]}
      onClickRow={(enableClickRow && !disableEdit)
        ? (rowIndex: number) => {
          const object = objectsArray[rowIndex];
          if (object && typeof window !== 'undefined') {
            window.open(`/settings/workspace/roles/${object?.id}`, '_blank').focus();
          }
        }
        : null
      }
      rows={objectsArray?.map((object) => {
        const {
          name,
          id,
        } = object;
        const checked = !!rolesMapping?.[id];

        return [
          ...(disableEdit ? [] : [<Checkbox
            checked={checked}
            key="checkbox"
            onClick={(e) => {
              pauseEvent(e);

              const mapping = { ...rolesMapping };

              if (checked) {
                delete mapping?.[id];
              } else {
                mapping[id] = object;
              }

              setObjectAttributes({
                rolesMapping: mapping,
              });
            }}
          />]),
          <Text key="name" monospace>
            {name}
          </Text>,
        ];
      })}
      uuid="roles"
    />
  ), [
    rolesMapping,
    setObjectAttributes,
  ]);

  const buildTablePermissions = useCallback((
    objectArray: PermissionType[],
    enableClickRow?: boolean,
    disableEdit?: boolean,
  ) => (
   <Table
      columnFlex={[null, 2, 1, 1, 6]}
      columns={[
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
      onClickRow={(enableClickRow && !disableEdit)
        ? (rowIndex: number) => {
          const object = objectArray[rowIndex];
          if (object && typeof window !== 'undefined') {
            window.open(`/settings/workspace/permissions/${object?.id}`, '_blank').focus();
          }
        }
        : null
      }
      rows={objectArray?.map(({
        access,
        entity,
        entity_id: entityID,
        entity_name: entityName,
        entity_type: entityType,
        id,
      }) => {
        const accessDisplayNames = access ? displayNames(access) : [];
        const accessDisplayNamesCount = accessDisplayNames?.length || 0;

        return [
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
  ), []);

  const afterRoles = useMemo(() => buildTable(rolesAll), [
    buildTable,
    rolesAll,
  ]);

  const rolesMemo = useMemo(() => buildTable(roles, true, (disableFields || [])?.includes(ObjectTypeEnum.ROLES)), [
    buildTable,
    disableFields,
    roles,
  ]);

  const permissionsMemo = useMemo(() => buildTablePermissions(permissions, true, (disableFields || [])?.includes(ObjectTypeEnum.PERMISSIONS)), [
    buildTablePermissions,
    permissions,
  ]);

  const contentMemo = (
    <ContainerStyle>
      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <Headline level={4}>
            Profile
          </Headline>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text default large>
              Avatar
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
                  avatar: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="Add initials or an emoji"
                value={objectAttributes?.avatar || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              danger={'username' in attributesTouched && !objectAttributes?.username}
              default
              large
            >
              Username {'username' in attributesTouched && !objectAttributes?.username && (
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
                large
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributes({
                  username: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. Mage Supreme"
                value={objectAttributes?.username || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              default
              large
            >
              First name
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
                large
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributes({
                  first_name: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. Urza"
                value={objectAttributes?.first_name || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              default
              large
            >
              Last name
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
                large
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributes({
                  last_name: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. Andromeda"
                value={objectAttributes?.last_name || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            {user && (
              <Text default large>
                Email
              </Text>
            )}

            {!user && (
              <Text
                danger={'email' in attributesTouched && !objectAttributes?.email}
                default
                large
              >
                Email {'email' in attributesTouched && !objectAttributes?.email && (
                  <Text danger inline large>
                    is required
                  </Text>
                )}
              </Text>
            )}

            <Spacing mr={PADDING_UNITS} />

            {user && (
              <Flex
                alignItems="center"
                flex={1}
                justifyContent="flex-end"
              >
                <Text large muted>
                  {objectAttributes?.email}
                </Text>

                <Spacing mr={PADDING_UNITS} />

                <Alphabet muted size={ICON_SIZE} />

                <Spacing mr={1} />
              </Flex>
            )}

            {!user && (
              <Flex flex={1}>
                <TextInput
                  afterIcon={<Alphabet />}
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
                    email: e.target.value,
                  })}
                  paddingHorizontal={0}
                  paddingVertical={0}
                  placeholder="e.g. mage@power.com"
                  type="email"
                  value={objectAttributes?.email || ''}
                />
              </Flex>
            )}
          </FlexContainer>
        </Spacing>
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <Headline level={4}>
            Authentication
          </Headline>
        </Spacing>

        <Divider light />

        {user && (
          <>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer alignItems="center">
                <Text
                  danger={'password_current' in attributesTouched && !objectAttributes?.password_current}
                  default
                  large
                >
                  Current password {'password_current' in attributesTouched && !objectAttributes?.password_current && (
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
                    large
                    noBackground
                    noBorder
                    fullWidth
                    onChange={e => setObjectAttributes({
                      password_current: e.target.value,
                    })}
                    paddingHorizontal={0}
                    paddingVertical={0}
                    placeholder="* * * * * * * *"
                    type="password"
                    value={objectAttributes?.password_current || ''}
                  />
                </Flex>
              </FlexContainer>
            </Spacing>

            <Divider light />
          </>
        )}

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              danger={'password' in attributesTouched && !objectAttributes?.password}
              default
              large
            >
              {user ? 'New password' : 'Password'} {'password' in attributesTouched && !objectAttributes?.password && (
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
                  password: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="* * * * * * * *"
                type="password"
                value={objectAttributes?.password || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              danger={'password_confirmation' in attributesTouched && !objectAttributes?.password_confirmation}
              default
              large
            >
              Confirm {user ? 'new password' : 'password'} {'password_confirmation' in attributesTouched && !objectAttributes?.password_confirmation && (
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
                  password_confirmation: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="* * * * * * * *"
                type="password"
                value={objectAttributes?.password_confirmation || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      {user && (
        <>
          <Panel noPadding>
            <Spacing p={PADDING_UNITS}>
              <FlexContainer
                alignItems="center"
                justifyContent="space-between"
              >
                <Headline level={4}>
                  Roles
                </Headline>

                <Spacing mr={PADDING_UNITS} />

                {hasRoles && !(disableFields || [])?.includes(ObjectTypeEnum.ROLES) && (
                  <FlexContainer alignItems="center">
                    {addRoleButton}
                  </FlexContainer>
                )}
              </FlexContainer>
            </Spacing>

            <Divider light />

            {!hasRoles && !(disableFields || [])?.includes(ObjectTypeEnum.ROLES) && (
              <Spacing p={PADDING_UNITS}>
                <Spacing mb={PADDING_UNITS}>
                  <Text default>
                    This user currently has no roles attached.
                  </Text>
                </Spacing>

                <FlexContainer alignItems="center">
                  {addRoleButton}
                </FlexContainer>
              </Spacing>
            )}

            {hasRoles && (
              <Spacing pb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
                {rolesMemo}
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
                  Permissions
                </Headline>
              </FlexContainer>
            </Spacing>

            <Divider light />

            {!hasPermissions && (
              <Spacing p={PADDING_UNITS}>
                <Text default>
                  This user currently has no permissions.
                </Text>
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
            user: {
              ...selectKeys(objectAttributes, [
                'avatar',
                'first_name',
                'last_name',
                'password',
                'password_confirmation',
                'password_current',
                'username',
              ].concat(user ? [] : 'email'), {
                include_blanks: true,
              }),
              ...(disableFields?.includes(ObjectTypeEnum.ROLES) ? {} : {
                role_ids: Object.keys(
                  objectAttributes?.rolesMapping || {},
                ).map(i => Number(i)),
              }),
            },
          })}
          primary
        >
          {user ? 'Save changes' : 'Create new user'}
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

        {user && String(currentUserID) !== String(slug) && isOwner && (
          <>
            <Spacing mr={PADDING_UNITS} />

            <Button
              beforeIcon={<Trash />}
              danger
              loading={isLoadingDeleteObject}
              onClick={() => deleteObject()}
            >
              Delete user
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
      after={afterRoles}
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
          label: () => 'Users',
          linkProps: {
            href: '/settings/workspace/users'
          },
        },
        {
          bold: true,
          label: () => displayName(objectAttributes),
        },
      ]}
      setAfterHidden={setAfterHidden}
      title={user ? displayName(user) : 'New user'}
      uuidItemSelected={SectionItemEnum.USERS}
      uuidWorkspaceSelected={SectionEnum.USER_MANAGEMENT}
    >
      {user && contentMemo}
    </SettingsDashboard>
  );
}

export default UserDetail;
