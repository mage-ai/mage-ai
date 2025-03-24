import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Paginate, { ROW_LIMIT } from '@components/shared/Paginate';
import PrivateRoute from '@components/shared/PrivateRoute';
import RoleType from '@interfaces/RoleType';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import UserDetail from '@components/users/UserDetail';
import UserType from '@interfaces/UserType';
import api from '@api';
import { AddUserSmileyFace } from '@oracle/icons';
import { BreadcrumbType } from '@components/Breadcrumbs';
import { MetaQueryEnum } from '@api/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum } from '@components/settings/Dashboard/constants';
import { dateFormatLong } from '@utils/date';
import { getUser } from '@utils/session';
import { queryFromUrl, queryString } from '@utils/url';

function UsersListPage() {
  const router = useRouter();

  const [isAddingNew, setIsAddingNew] = useState(false);

  const {
    id: currentUserID,
    owner: isOwner,
  } = getUser(router?.basePath) || {};

  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;
  const usersRequestQuery: {
    _limit?: number;
    _offset?: number;
  } = {
    [MetaQueryEnum.LIMIT]: ROW_LIMIT,
    [MetaQueryEnum.OFFSET]: page * ROW_LIMIT,
  };
  const { data } = api.users.list(
    usersRequestQuery,
    {
      revalidateOnFocus: false,
    },
  );
  const users = useMemo(() => data?.users || [], [data?.users]);
  const totalUsers = useMemo(() => data?.metadata?.count || [], [data]);

  const breadcrumbs: BreadcrumbType[] = [
    {
      bold: !isAddingNew,
      label: () => 'Users',
    },
  ];

  if (isAddingNew) {
    breadcrumbs[0].onClick = () => setIsAddingNew(false);
    breadcrumbs.push({
      bold: true,
      label: () => 'New user',
    });
  } else {
    breadcrumbs[0].linkProps = {
      href: '/settings/workspace/users',
    };
  }

  return (
    <SettingsDashboard
      appendBreadcrumbs
      breadcrumbs={breadcrumbs}
      title="Users"
      uuidItemSelected={SectionItemEnum.USERS}
      uuidWorkspaceSelected={SectionEnum.USER_MANAGEMENT}
    >
      {isAddingNew && <UserDetail contained onCancel={() => setIsAddingNew(false)} />}
      {!isAddingNew && (
        <>
          {isOwner &&
            <Spacing p={PADDING_UNITS}>
              <Button
                beforeIcon={<AddUserSmileyFace />}
                onClick={() => setIsAddingNew(true)}
                primary
              >
                Add new user
              </Button>
            </Spacing>
          }

          <Divider light />

          <Table
            columnFlex={[null, 1, 1, 1, 1, null, null]}
            columns={[
              {
                label: () => '',
                uuid: 'avatar',
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
              {
                uuid: 'Email',
              },
              {
                uuid: 'Role',
              },
              {
                rightAligned: true,
                uuid: 'Created',
              },
            ]}
            onClickRow={(rowIndex: number) => {
              const rowUserID = users[rowIndex]?.id;
              router.push(`/settings/workspace/users/${rowUserID}`);
            }}
            rows={users.map(({
              avatar,
              created_at: createdAt,
              email,
              first_name: firstName,
              last_name: lastName,
              roles_display,
              roles_new,
              username,
            }: UserType) => {
              const sortedRoles = roles_new || [];
              sortedRoles.sort((a: RoleType, b: RoleType) => a.id - b.id);

              return [
                <Text key="avatar" large rightAligned>
                  {avatar}
                </Text>,
                <Text key="username">
                  {username || '-'}
                </Text>,
                <Text default key="firstName">
                  {firstName || '-'}
                </Text>,
                <Text default key="lastName">
                  {lastName || '-'}
                </Text>,
                <Text default key="email">
                  {email}
                </Text>,
                <Text default key="roles">
                  {sortedRoles.length > 0 ? sortedRoles[0].name : roles_display}
                </Text>,
                <Text default key="created" monospace>
                  {createdAt && dateFormatLong(createdAt)}
                </Text>,
              ];
            })}
            uuid="pipeline-runs"
          />
          <Spacing p={2}>
            <Paginate
              maxPages={9}
              onUpdate={(p) => {
                const newPage = Number(p);
                const updatedQuery = {
                  ...q,
                  page: newPage >= 0 ? newPage : 0,
                };
                router.push(
                  '/settings/workspace/users',
                  `/settings/workspace/users?${queryString(updatedQuery)}`,
                );
              }}
              page={Number(page)}
              totalPages={Math.ceil(totalUsers / ROW_LIMIT)}
            />
          </Spacing>
        </>
      )}
    </SettingsDashboard>
  );
}

UsersListPage.getInitialProps = async () => ({});

export default PrivateRoute(UsersListPage);
