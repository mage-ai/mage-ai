import { toast } from 'react-toastify';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import PrivateRoute from '@components/shared/PrivateRoute';
import RoleDetail from '@components/Roles/RoleDetail';
import RoleType from '@interfaces/RoleType';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import { BreadcrumbType } from '@components/Breadcrumbs';
import { Edit } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum, } from '@components/settings/Dashboard/constants';
import { dateFormatLong } from '@utils/date';
import { displayName } from '@utils/models/user';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

function RolesListPage() {
  const router = useRouter();

  const [isAddingNew, setIsAddingNew] = useState(false);

  const { data } = api.roles.list();
  const roles: RoleType[] = useMemo(() => data?.roles || [], [data]);

  const breadcrumbs: BreadcrumbType[] = [
    {
      bold: !isAddingNew,
      label: () => 'Roles',
    },
  ];

  if (isAddingNew) {
    breadcrumbs[0].onClick = () => setIsAddingNew(false);
    breadcrumbs.push({
      bold: true,
      label: () => 'New role',
    });
  } else {
    breadcrumbs[0].linkProps = {
      href: '/settings/workspace/roles'
    };
  }

  const [createSeed, { isLoading: isLoadingCreateSeed }] = useMutation(
    api.seeds.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            toast.success(
              'Started creating default roles and permissions. Check back later to see the roles.',
              {
                position: toast.POSITION.BOTTOM_RIGHT,
                toastId: 'seed-create-success',
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
      breadcrumbs={breadcrumbs}
      title="Roles"
      uuidItemSelected={SectionItemEnum.ROLES}
      uuidWorkspaceSelected={SectionEnum.USER_MANAGEMENT}
    >
      {isAddingNew && <RoleDetail contained onCancel={() => setIsAddingNew(false)} />}
      {!isAddingNew && (
        <>
          <Spacing p={PADDING_UNITS}>
            <FlexContainer alignItems="center" justifyContent="space-between">
              <Button
                beforeIcon={<Mage8Bit />}
                onClick={() => setIsAddingNew(true)}
                primary
              >
                Add new role
              </Button>

              <Spacing mr={PADDING_UNITS} />

              <Tooltip
                appearBefore
                fullSize
                description={(
                  <Text default>
                    This will create 6 roles and 100s of permissions
                    <br />
                    that Mage normally uses when user defined
                    <br />
                    permissions isn’t turned on.
                  </Text>
                )}
                lightBackground
                widthFitContent
              >
                <Button
                  compact
                  loading={isLoadingCreateSeed}
                  // @ts-ignore
                  onClick={() => createSeed({
                    seed: {
                      permissions: true,
                      roles: true,
                    },
                  })}
                  secondary
                  small
                >
                  Create default roles and permissions
                </Button>
              </Tooltip>
            </FlexContainer>
          </Spacing>

          <Divider light />

          <Table
            columnFlex={[1, 1, 1, null]}
            columns={[
              {
                uuid: 'Role',
              },
              {
                uuid: 'Created by',
              },
              {
                uuid: 'Last updated',
              },
              {
                rightAligned: true,
                uuid: 'Created at',
              },
            ]}
            onClickRow={(rowIndex: number) => {
              const id = roles[rowIndex]?.id;
              router.push(`/settings/workspace/roles/${id}`);
            }}
            rows={roles?.map(({
              created_at: createdAt,
              id,
              name,
              updated_at: updatedAt,
              user,
            }) => [
              <Text key="name">
                {name}
              </Text>,
              user
                ? (
                  <Link
                    default
                    onClick={(e) => {
                      pauseEvent(e);
                      router.push(`/settings/workspace/users/${user?.id}`);
                    }}
                  >
                    {displayName(user)}
                  </Link>
                )
                : <div key="user" />,
              <Text monospace default key="updatedAt">
                {updatedAt && dateFormatLong(updatedAt)}
              </Text>,
              <Text monospace default key="createdAt" rightAligned>
                {createdAt && dateFormatLong(createdAt)}
              </Text>,
            ])}
            uuid="roles"
          />
        </>
      )}
    </SettingsDashboard>
  );
}

RolesListPage.getInitialProps = async () => ({});

export default PrivateRoute(RolesListPage);
