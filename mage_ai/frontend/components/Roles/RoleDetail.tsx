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
import PermissionType from '@interfaces/PermissionType';
import RoleType, { UserType } from '@interfaces/RoleType';
import Spacing from '@oracle/elements/Spacing';
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
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { dateFormatLong } from '@utils/date';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

const ICON_SIZE = 2 * UNIT;

type ObjectAttributesType = {
  created_at?: string;
  name?: string;
  updated_at?: string;
};

type RoleDetailProps = {
  role?: RoleType;
};

function RoleDetail({
  role,
}: RoleDetailProps) {
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
    if (role) {
      setObjectAttributesState(role);
    }
  }, [
    setObjectAttributesState,
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
            setObjectAttributesState(objectServer);

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

  const permissions: PermissionType[] = useMemo(() => role?.role_permissions || [], [
    role,
  ]);
  const users: UserType[] = useMemo(() => role?.users || [], [
    role,
  ]);

  const hasPermissions = useMemo(() => permissions?.length >= 1, [permissions]);
  const addPermissionButton = useMemo(() => (
    <Button
      beforeIcon={<Add />}
      compact
      onClick={(e) => {

      }}
      primary={!hasPermissions}
      secondary={hasPermissions}
      small
    >
      Add permission
    </Button>
  ), [
    hasPermissions,
  ]);

  const hasUsers = useMemo(() => users?.length >= 1, [users]);
  const addUserButton = useMemo(() => (
    <Button
      beforeIcon={<Add />}
      compact
      onClick={(e) => {

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

  return (
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

            <Spacing p={PADDING_UNITS}>
              {!hasPermissions && (
                <>
                  <Spacing mb={PADDING_UNITS}>
                    <Text default>
                      This role currently has no permissions attached.
                    </Text>
                  </Spacing>

                  <FlexContainer alignItems="center">
                    {addPermissionButton}
                  </FlexContainer>
                </>
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

                <Spacing mr={PADDING_UNITS} />

                {hasUsers && (
                  <FlexContainer alignItems="center">
                    {addUserButton}
                  </FlexContainer>
                )}
              </FlexContainer>
            </Spacing>

            <Divider light />

            <Spacing p={PADDING_UNITS}>
              {!hasUsers && (
                <>
                  <Spacing mb={PADDING_UNITS}>
                    <Text default>
                      There are currently no users with this role.
                    </Text>
                  </Spacing>

                  <FlexContainer alignItems="center">
                    {addUserButton}
                  </FlexContainer>
                </>
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
                    {(role?.user?.first_name || role?.user?.last_name)
                      ?
                        [
                          role?.user?.first_name,
                          role?.user?.last_name,
                        ].filter(n => n).join(' ')
                      : role?.user?.username
                    }
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
            role: selectKeys(objectAttributes, [
              'name',
            ], {
              include_blanks: true,
            }),
          })}
          primary
        >
          {role ? 'Save changes' : 'Create new role'}
        </Button>

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
}

export default RoleDetail;
