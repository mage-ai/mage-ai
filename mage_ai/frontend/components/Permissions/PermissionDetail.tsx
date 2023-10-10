import { toast } from 'react-toastify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
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
  PERMISSION_DISABLE_ACCESS_OPERATIONS,
  PermissionAccessEnum,
  UserType,
} from '@interfaces/PermissionType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
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
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import {
  addBinaryStrings,
  binaryStringToNumber,
  minusBinaryStrings,
  numberToBinaryString,
} from '@utils/number';
import { camelCaseToNormalWithSpaces } from '@utils/string';
import { dateFormatLong } from '@utils/date';
import { displayName } from '@utils/models/user';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

const ICON_SIZE = 2 * UNIT;

type ObjectAttributesType = {
  access?: number;
  created_at?: string;
  entity_id?: string | number;
  entity_name?: string;
  entity_type?: string;
  query_attributes?: string;
  read_attributes?: string;
  updated_at?: string;
  write_attributes?: string;
};

type PermissionDetailProps = {
  onCancel?: () => void;
  permission?: PermissionType;
};

function PermissionDetail({
  onCancel,
  permission,
}: PermissionDetailProps) {
  const router = useRouter();

  const [attributesTouched, setAttributesTouched] = useState<ObjectAttributesType>({});
  const [objectAttributes, setObjectAttributesState] = useState<ObjectAttributesType>(null);
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

  useEffect(() => {
    if (permission) {
      setObjectAttributesState(permission);
    }
  }, [
    setObjectAttributesState,
    permission,
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
            setObjectAttributesState(objectServer);

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
    const checked = (access & Number(permissionAccess)) as boolean;
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
  ]);

  const roles: PermissionType[] = useMemo(() => permission?.roles || [], [
    permission,
  ]);
  const users: UserType[] = useMemo(() => permission?.users || [], [
    permission,
  ]);

  const hasRoles = useMemo(() => roles?.length >= 1, [roles]);
  const hasUsers = useMemo(() => users?.length >= 1, [users]);

  return (
    <ContainerStyle>
      <Panel noPadding>
        <Spacing p={PADDING_UNITS}>
          <Headline level={4}>
            Permission
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
                {permission?.entity_names.map((entityName: string) => (
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
                {permission?.entity_types.map((entityType: string) => (
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

        <Spacing p={PADDING_UNITS}>
          <Spacing mb={PADDING_UNITS}>
            <Text default large>
              Groups
            </Text>
          </Spacing>

          {buildAccessMemo(PERMISSION_ACCESS_GROUPS)}
        </Spacing>

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
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              {!hasRoles && (
                <Text default>
                  This permission is currently not attached to any role.
                </Text>
              )}
            </Spacing>
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

            <Spacing p={PADDING_UNITS}>
              {!hasUsers && (
                <Text default>
                  There are currently no users with this permission.
                </Text>
              )}
            </Spacing>
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
          disabled={!attributesTouched || isEmptyObject(attributesTouched)}
          loading={isLoadingMutateObject}
          // @ts-ignore
          onClick={() => mutateObject({
            permission: selectKeys(objectAttributes, [
              'access',
              'entity_id',
              'entity_name',
              'entity_type',
              'query_attributes',
              'read_attributes',
              'write_attributes',
            ], {
              include_blanks: true,
            }),
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
}

export default PermissionDetail;
