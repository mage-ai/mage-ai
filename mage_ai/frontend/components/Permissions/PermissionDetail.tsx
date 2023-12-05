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
import PermissionType, {
  PERMISSION_ACCESS_GROUPS,
  PERMISSION_ACCESS_HUMAN_READABLE_MAPPING,
  PERMISSION_ACCESS_OPERATIONS,
  PERMISSION_ACCESS_QUERY_OPERATIONS,
  PERMISSION_ACCESS_READ_OPERATIONS,
  PERMISSION_ACCESS_WRITE_OPERATIONS,
  PERMISSION_CONDITION_HUMAN_READABLE_MAPPING,
  PERMISSION_DISABLE_ACCESS_OPERATIONS,
  PermissionAccessEnum,
  PermissionConditionEnum,
  UserType,
} from '@interfaces/PermissionType';
import RoleType from '@interfaces/RoleType';
import Select from '@oracle/elements/Inputs/Select';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
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
import {
  addBinaryStrings,
  binaryStringToNumber,
  minusBinaryStrings,
  numberToBinaryString,
} from '@utils/number';
import { camelCaseToNormalWithSpaces } from '@utils/string';
import { dateFormatLong } from '@utils/date';
import { displayName } from '@utils/models/user';
import { indexBy, sortByKey } from '@utils/array';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

const ICON_SIZE = 2 * UNIT;

enum ObjectTypeEnum {
  ROLES = 'Roles',
  USERS = 'Users',
}

type ObjectAttributesType = {
  access?: number;
  conditions?: PermissionConditionEnum[];
  created_at?: string;
  entity_id?: string | number;
  entity_name?: string;
  entity_type?: string;
  query_attributes?: string[];
  read_attributes?: string[];
  rolesMapping?: {
    [id: number]: RoleType;
  };
  updated_at?: string;
  usersMapping?: {
    [id: number]: UserType;
  };
  write_attributes?: string[];
};

type PermissionDetailProps = {
  contained?: boolean;
  onCancel?: () => void;
  slug?: number | string;
};

function PermissionDetail({
  contained,
  onCancel,
  slug,
}: PermissionDetailProps) {
  const router = useRouter();

  const [afterHidden, setAfterHidden] = useState(true);
  const [addingObjectType, setAddingObjectType] = useState(null);
  const [attributesTouched, setAttributesTouched] = useState<ObjectAttributesType>({});
  const [objectAttributes, setObjectAttributesState] = useState<ObjectAttributesType>(null);

  const setObjectAttributesStateWithMapping = useCallback((
    data,
    rolesArray,
    usersArray,
  ) => {
    setObjectAttributesState({
      ...data,
      rolesMapping: indexBy(rolesArray || [], ({ id }) => id),
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

  const { data } = api.permissions.detail(slug, {}, {
    revalidateOnFocus: false,
  });
  const permission = useMemo(() => data?.permission, [data]);

  useEffect(() => {
    if (permission) {
      setObjectAttributesStateWithMapping(
        permission,
        permission?.roles,
        permission?.users,
      );
    }
  }, [
    setObjectAttributesStateWithMapping,
    permission,
  ]);

  const { data: dataPermissions } = api.permissions.list({
    _format: 'with_only_entity_options',
    only_entity_options: true,
  }, {}, {
    pauseFetch: !!permission,
  });
  const permissionEmpty = useMemo(() => dataPermissions?.permissions?.[0], [dataPermissions]);

  const entityNames: string[] = useMemo(() => (permission || permissionEmpty)?.entity_names || [], [
    permission,
    permissionEmpty,
  ]);
  const entityTypes: string[] = useMemo(() => (permission || permissionEmpty)?.entity_types || [], [
    permission,
    permissionEmpty,
  ]);

  const [mutateObject, { isLoading: isLoadingMutateObject }] = useMutation(
    permission ? api.permissions.useUpdate(permission?.id) : api.permissions.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            permission: objectServer,
          }) => {
            setAttributesTouched({});
            setObjectAttributesStateWithMapping(
              objectServer,
              objectServer?.roles,
              objectServer?.users,
            );

            if (!permission) {
              router.push(`/settings/workspace/permissions/${objectServer?.id}`);
            }

            toast.success(
              permission ? 'Permission successfully updated.' : 'New permission created successfully.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `permission-mutate-success-${objectServer.id}`,
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
    api.permissions.useDelete(permission?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            router.push('/settings/workspace/permissions');

            toast.success(
              'Permission successfully delete.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: `permission-delete-success-${permission?.id}`,
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

  const access = useMemo(() => objectAttributes?.access || 0, [objectAttributes]);
  const buildAccessMemo = useCallback((
    permissionAccesses: PermissionAccessEnum[],
  ) => permissionAccesses.map((permissionAccess: PermissionAccessEnum, idx: number) => {
    const displayName = PERMISSION_ACCESS_HUMAN_READABLE_MAPPING[permissionAccess];
    const checked = Boolean(access & Number(permissionAccess));
    const binaryStringCurrent = numberToBinaryString(access);
    const binaryStringNew = numberToBinaryString(permissionAccess);

    return (
      <Spacing key={displayName} mt={idx >= 1 ? 1 : 0}>
        <FlexContainer alignItems="center">
          <ToggleSwitch
            checked={checked}
            compact
            onCheck={(valFunc: (val: boolean) => boolean) => setObjectAttributes({
              access: binaryStringToNumber(valFunc(checked)
                ? addBinaryStrings(binaryStringCurrent, binaryStringNew)
                : minusBinaryStrings(binaryStringCurrent, binaryStringNew)
              ),
            })}
          />

          <Spacing mr={PADDING_UNITS} />

          <Text default={!checked}>
            {displayName}
          </Text>
        </FlexContainer>
      </Spacing>
    );
  }), [
    access,
    setObjectAttributes,
  ]);

  const conditions = useMemo(() => objectAttributes?.conditions || [], [
    objectAttributes,
  ]);
  const buildSpecialConditionsMemo = useMemo(() => {
    const permissionAccess = PermissionAccessEnum.DISABLE_UNLESS_CONDITIONS;
    const binaryStringCurrent = numberToBinaryString(access);
    const binaryStringNew = numberToBinaryString(permissionAccess);

    const hasAccess = Boolean(access & Number(permissionAccess));

    let conditionsUpdated = new Set([...conditions]);

    const conditionHasNotebookEditAccess =
      conditionsUpdated.has(PermissionConditionEnum.HAS_NOTEBOOK_EDIT_ACCESS);
    const conditionHasPipelineEditAccess =
      conditionsUpdated.has(PermissionConditionEnum.HAS_PIPELINE_EDIT_ACCESS);
    const conditionUserOwnsEntity =
      conditionsUpdated.has(PermissionConditionEnum.USER_OWNS_ENTITY);

    const checkedHasNotebookEditAccess = hasAccess && conditionHasNotebookEditAccess;
    const checkedHasPipelineEditAccess = hasAccess && conditionHasPipelineEditAccess;
    const checkedUserOwnsEntity = hasAccess && conditionUserOwnsEntity;

    return (
      <FlexContainer flexDirection="column">
        <Spacing mt={1}>
          <FlexContainer alignItems="center">
            <ToggleSwitch
              checked={checkedHasNotebookEditAccess}
              compact
              onCheck={(valFunc: (val: boolean) => boolean) => {
                let accessBinaryStringUpdated = binaryStringCurrent;

                if (valFunc(checkedHasNotebookEditAccess)) {
                  if (!hasAccess) {
                    accessBinaryStringUpdated = addBinaryStrings(binaryStringCurrent, binaryStringNew);
                  }
                  conditionsUpdated.add(PermissionConditionEnum.HAS_NOTEBOOK_EDIT_ACCESS);
                } else {
                  if (!conditionHasPipelineEditAccess && !conditionUserOwnsEntity) {
                    accessBinaryStringUpdated = minusBinaryStrings(binaryStringCurrent, binaryStringNew);
                  }
                  conditionsUpdated.delete(PermissionConditionEnum.HAS_NOTEBOOK_EDIT_ACCESS);
                }

                setObjectAttributes({
                  access: binaryStringToNumber(accessBinaryStringUpdated),
                  // @ts-ignore
                  conditions: [...conditionsUpdated],
                });
              }}
            />

            <Spacing mr={PADDING_UNITS} />

            <Text default={!checkedHasNotebookEditAccess}>
              {PERMISSION_CONDITION_HUMAN_READABLE_MAPPING[PermissionConditionEnum.HAS_NOTEBOOK_EDIT_ACCESS]}
            </Text>
          </FlexContainer>
        </Spacing>

        <Spacing mt={1}>
          <FlexContainer alignItems="center">
            <ToggleSwitch
              checked={checkedHasPipelineEditAccess}
              compact
              onCheck={(valFunc: (val: boolean) => boolean) => {
                let accessBinaryStringUpdated = binaryStringCurrent;

                if (valFunc(checkedHasPipelineEditAccess)) {
                  if (!hasAccess) {
                    accessBinaryStringUpdated = addBinaryStrings(binaryStringCurrent, binaryStringNew);
                  }
                  conditionsUpdated.add(PermissionConditionEnum.HAS_PIPELINE_EDIT_ACCESS);
                } else {
                  if (!conditionHasNotebookEditAccess && !conditionUserOwnsEntity) {
                    accessBinaryStringUpdated = minusBinaryStrings(binaryStringCurrent, binaryStringNew);
                  }
                  conditionsUpdated.delete(PermissionConditionEnum.HAS_PIPELINE_EDIT_ACCESS);
                }

                setObjectAttributes({
                  access: binaryStringToNumber(accessBinaryStringUpdated),
                  // @ts-ignore
                  conditions: [...conditionsUpdated],
                });
              }}
            />

            <Spacing mr={PADDING_UNITS} />

            <Text default={!checkedHasPipelineEditAccess}>
              {PERMISSION_CONDITION_HUMAN_READABLE_MAPPING[PermissionConditionEnum.HAS_PIPELINE_EDIT_ACCESS]}
            </Text>
          </FlexContainer>
        </Spacing>

        <Spacing mt={1}>
          <FlexContainer alignItems="center">
            <ToggleSwitch
              checked={checkedUserOwnsEntity}
              compact
              onCheck={(valFunc: (val: boolean) => boolean) => {
                let accessBinaryStringUpdated = binaryStringCurrent;

                if (valFunc(checkedUserOwnsEntity)) {
                  if (!hasAccess) {
                    accessBinaryStringUpdated = addBinaryStrings(binaryStringCurrent, binaryStringNew);
                  }
                  conditionsUpdated.add(PermissionConditionEnum.USER_OWNS_ENTITY);
                } else {
                  if (!conditionHasNotebookEditAccess && !conditionHasNotebookEditAccess) {
                    accessBinaryStringUpdated = minusBinaryStrings(binaryStringCurrent, binaryStringNew);
                  }
                  conditionsUpdated.delete(PermissionConditionEnum.USER_OWNS_ENTITY);
                }

                setObjectAttributes({
                  access: binaryStringToNumber(accessBinaryStringUpdated),
                  // @ts-ignore
                  conditions: [...conditionsUpdated],
                });
              }}
            />

            <Spacing mr={PADDING_UNITS} />

            <Text default={!checkedUserOwnsEntity}>
              {PERMISSION_CONDITION_HUMAN_READABLE_MAPPING[PermissionConditionEnum.USER_OWNS_ENTITY]}
            </Text>
          </FlexContainer>
        </Spacing>
      </FlexContainer>
    );
  }, [
    access,
    conditions,
    setObjectAttributes,
  ]);

  const { data: dataRoles } = api.roles.list({}, {}, {
    pauseFetch: !permission,
  });
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

  const { data: dataUsers } = api.users.list({}, {}, {
    pauseFetch: !permission,
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

  const hasUsers = useMemo(() => users?.length >= 1, [users]);

  const buildTable = useCallback((
    objectsArray: RoleType[],
    enableClickRow?: boolean,
  ) => (
    <Table
      columnFlex={[null, 1]}
      columns={[
        {
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
        },
        {
          uuid: 'Role',
        },
      ]}
      onClickRow={enableClickRow
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
          <Checkbox
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
          />,
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

  const buildTableUsers = useCallback((
    objectArray: UserType[],
    enableClickRow?: boolean,
  ) => (
    <Table
      columnFlex={[1, 1, 1]}
      columns={[
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
      rows={objectArray?.map(({
        first_name: firstName,
        last_name: lastName,
        username,
      }) => {
        return [
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

  const afterRoles = useMemo(() => buildTable(rolesAll), [
    buildTable,
    rolesAll,
  ]);

  const rolesMemo = useMemo(() => buildTable(roles, true), [
    buildTable,
    roles,
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
            {permission ? `Permission ${permission?.id}` : 'New permission'}
          </Headline>
        </Spacing>

        <Divider light />

        <Spacing p={PADDING_UNITS}>
          <FlexContainer alignItems="center">
            <Text
              danger={'entity_name' in attributesTouched && !objectAttributes?.entity_name}
              default
              large
            >
              Entity {'entity_name' in attributesTouched && !objectAttributes?.entity_name && (
                <Text danger inline large>
                  is required
                </Text>
              )}
            </Text>

            <Spacing mr={PADDING_UNITS} />

            <Flex flex={1} justifyContent="flex-end">
              <Select
                afterIconSize={ICON_SIZE}
                alignRight
                autoComplete="off"
                large
                noBackground
                noBorder
                onChange={e => setObjectAttributes({
                  entity_name: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="Select an entity"
                value={objectAttributes?.entity_name || ''}
              >
                {entityNames.map((entityName: string) => (
                  <option key={entityName} value={entityName}>
                    {camelCaseToNormalWithSpaces(entityName)}
                  </option>
                ))}
              </Select>
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
              Entity subtype
            </Text>

            <Spacing mr={PADDING_UNITS} />

            <Flex flex={1} justifyContent="flex-end">
              <Select
                afterIconSize={ICON_SIZE}
                alignRight
                autoComplete="off"
                large
                monospace
                noBackground
                noBorder
                onChange={e => setObjectAttributes({
                  entity_type: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="Select an entity subtype"
                value={objectAttributes?.entity_type || ''}
              >
                <option value="" />
                {entityTypes.map((entityType: string) => (
                  <option key={entityType} value={entityType}>
                    {entityType}
                  </option>
                ))}
              </Select>
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
              Enity UUID
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
                monospace
                noBackground
                noBorder
                fullWidth
                onChange={e => setObjectAttributes({
                  entity_id: e.target.value,
                })}
                paddingHorizontal={0}
                paddingVertical={0}
                placeholder="e.g. pipeline_uuid"
                value={objectAttributes?.entity_id || ''}
              />
            </Flex>
          </FlexContainer>
        </Spacing>
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <Headline level={4}>
            Access
          </Headline>
        </Spacing>

        <Divider light />

        <FlexContainer alignItems="center">
          <Flex flex={1}>
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Groups
                </Text>
              </Spacing>

              {buildAccessMemo(PERMISSION_ACCESS_GROUPS)}
            </Spacing>
          </Flex>

          <Flex flex={1}>
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Special conditions
                </Text>
              </Spacing>

              {buildSpecialConditionsMemo}
            </Spacing>
          </Flex>
        </FlexContainer>

        <Divider light />

        <FlexContainer alignItems="center">
          <Flex flex={1}>
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Operations
                </Text>
              </Spacing>

              {buildAccessMemo(PERMISSION_ACCESS_OPERATIONS)}
            </Spacing>
          </Flex>

          <Flex flex={1}>
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Disable operations
                </Text>
              </Spacing>

              {buildAccessMemo(PERMISSION_DISABLE_ACCESS_OPERATIONS)}
            </Spacing>
          </Flex>
        </FlexContainer>

        <Divider light />

        <FlexContainer alignItems="flex-start">
          <Flex flex={1}>
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Read attributes
                </Text>
              </Spacing>

               {buildAccessMemo(PERMISSION_ACCESS_READ_OPERATIONS)}
             </Spacing>
           </Flex>

           <Flex flex={1}>
            <Spacing fullWidth p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Readable attributes (comma separated)
                </Text>
              </Spacing>

              <TextArea
                fullWidth
                monospace
                onChange={e => setObjectAttributes({
                  read_attributes: e.target.value,
                })}
                placeholder="e.g. email"
                value={objectAttributes?.read_attributes || ''}
              />
            </Spacing>
          </Flex>
        </FlexContainer>

        <Divider light />

        <FlexContainer alignItems="flex-start">
          <Flex flex={1}>
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Write attributes
                </Text>
              </Spacing>

               {buildAccessMemo(PERMISSION_ACCESS_WRITE_OPERATIONS)}
             </Spacing>
           </Flex>

           <Flex flex={1}>
            <Spacing fullWidth p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Writable attributes (comma separated)
                </Text>
              </Spacing>

              <TextArea
                fullWidth
                monospace
                onChange={e => setObjectAttributes({
                  write_attributes: e.target.value,
                })}
                placeholder="e.g. password"
                value={objectAttributes?.write_attributes || ''}
              />
            </Spacing>
          </Flex>
        </FlexContainer>

        <Divider light />

        <FlexContainer alignItems="flex-start">
          <Flex flex={1}>
            <Spacing p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Query parameters
                </Text>
              </Spacing>

              {buildAccessMemo(PERMISSION_ACCESS_QUERY_OPERATIONS)}
            </Spacing>
          </Flex>

          <Flex flex={1}>
            <Spacing fullWidth p={PADDING_UNITS}>
              <Spacing mb={PADDING_UNITS}>
                <Text default large>
                  Parameters that can be queried (comma separated)
                </Text>
              </Spacing>

              <TextArea
                fullWidth
                monospace
                onChange={e => setObjectAttributes({
                  query_attributes: e.target.value,
                })}
                placeholder="e.g. include_outputs"
                value={objectAttributes?.query_attributes || ''}
              />
            </Spacing>
          </Flex>
        </FlexContainer>
      </Panel>

      <Spacing mb={UNITS_BETWEEN_SECTIONS} />

      {permission && (
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

                {hasRoles && (
                  <FlexContainer alignItems="center">
                    {addRoleButton}
                  </FlexContainer>
                )}
              </FlexContainer>
            </Spacing>

            <Divider light />

            {!hasRoles && (
              <Spacing p={PADDING_UNITS}>
                <Spacing mb={PADDING_UNITS}>
                  <Text default>
                    This permission is currently not attached to any role.
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
                  Users
                </Headline>
              </FlexContainer>
            </Spacing>

            <Divider light />

            {!hasUsers && (
              <Spacing p={PADDING_UNITS}>
                <Text default>
                  There are currently no users with this permission.
                </Text>
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
                    {displayName(permission?.user)}
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
            permission: {
              ...selectKeys(objectAttributes, [
                'access',
                'conditions',
                'entity_id',
                'entity_name',
                'entity_type',
                'query_attributes',
                'read_attributes',
                'write_attributes',
              ], {
                include_blanks: true,
              }),
              ...(permission
                  ? {
                    role_ids: Object.keys(
                      objectAttributes?.rolesMapping || {},
                    ).map(i => Number(i)),
                  }
                  : {}
              ),
            },
          })}
          primary
        >
          {permission ? 'Save changes' : 'Create new permission'}
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

        {permission && (
          <>
            <Spacing mr={PADDING_UNITS} />

            <Button
              beforeIcon={<Trash />}
              danger
              loading={isLoadingDeleteObject}
              onClick={() => deleteObject()}
            >
              Delete permission
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
      after={ObjectTypeEnum.ROLES === addingObjectType
          ? afterRoles
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
          label: () => 'Permissions',
          linkProps: {
            href: '/settings/workspace/permissions'
          },
        },
        {
          bold: true,
          label: () => `Permission ${permission?.id}`,
        },
      ]}
      hideAfterCompletely
      setAfterHidden={setAfterHidden}
      title={permission?.id ? `Permission ${permission?.id}` : 'New permission'}
      uuidItemSelected={SectionItemEnum.PERMISSIONS}
      uuidWorkspaceSelected={SectionEnum.USER_MANAGEMENT}
    >
      {permission && contentMemo}
    </SettingsDashboard>
  );
}

export default PermissionDetail;
