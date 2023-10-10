import { toast } from 'react-toastify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { ContainerStyle } from '@components/shared/index.style';
import {
  Alphabet,
  Edit,
  Locked,
  Save,
  Schedule,
  Trash,
} from '@oracle/icons';
import { PADDING_UNITS, UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum } from '@components/settings/Dashboard/constants';
import { dateFormatLong } from '@utils/date';
import { getUser } from '@utils/session';
import { isEmptyObject, selectKeys } from '@utils/hash';
import { onSuccess } from '@api/utils/response';

const ICON_SIZE = 2 * UNIT;

type UserAttributesType = {
  avatar?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  password?: string;
  password_confirmation?: string;
  password_current?: string;
  updated_at?: string;
  username?: string;
};

type UserDetailPageProps = {
  newUser?: boolean;
  slug: number | string;
};

function UserDetailPage({
  newUser,
  slug,
}: UserDetailPageProps) {
  const {
    owner: isOwner,
  } = getUser() || {};

  const [attributesTouched, setAttributesTouched] = useState<UserAttributesType>({});
  const [objectAttributes, setObjectAttributesState] = useState<UserAttributesType>(null);
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
      setObjectAttributesState(user);
    }
  }, [
    setObjectAttributesState,
    user,
  ]);

  const [updateUser, { isLoading: isLoadingUpdateUser }] = useMutation(
    newUser ? api.users.useCreate() : api.users.useUpdate(slug),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            user: userServer,
          }) => {
            setAttributesTouched({});
            setObjectAttributesState(userServer);

            toast.success(
              newUser ? 'New user created successfully.' : 'User profile successfully updated.',
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

  return (
    <SettingsDashboard
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
          label: () => objectAttributes?.username,
        },
      ]}
      uuidItemSelected={SectionItemEnum.USERS}
      uuidWorkspaceSelected={SectionEnum.WORKSPACE}
    >
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
              <Text default large>
                Email
              </Text>

              <Spacing mr={PADDING_UNITS} />

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

          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center">
              <Text
                danger={'password' in attributesTouched && !objectAttributes?.password}
                default
                large
              >
                New password {'password' in attributesTouched && !objectAttributes?.password && (
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
                Confirm new password {'password_confirmation' in attributesTouched && !objectAttributes?.password_confirmation && (
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
                  {user?.created_at && dateFormatLong(user?.created_at, {
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

        <FlexContainer>
          <Button
            beforeIcon={<Save />}
            disabled={!attributesTouched || isEmptyObject(attributesTouched)}
            loading={isLoadingUpdateUser}
            // @ts-ignore
            onClick={() => updateUser({
              user: selectKeys(objectAttributes, [
                'avatar',
                'first_name',
                'last_name',
                'password',
                'password_confirmation',
                'password_current',
                'username',
              ], {
                include_blanks: true,
              }),
            })}
            primary
          >
            Save changes
          </Button>


          {String(user?.id) !== String(slug) && isOwner && (
            <>
              <Spacing mr={PADDING_UNITS} />

              <Button
                beforeIcon={<Trash />}
                danger
              >
                Delete user
              </Button>
            </>
          )}

        </FlexContainer>
      </ContainerStyle>
    </SettingsDashboard>
  );
}

UserDetailPage.getInitialProps = async (ctx) => {
  const {
    slug,
  }: {
    slug: string[],
  } = ctx.query;

  return {
    slug: slug?.[0],
  };
};

export default PrivateRoute(UserDetailPage);
