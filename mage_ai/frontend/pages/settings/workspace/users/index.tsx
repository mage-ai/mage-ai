import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Headline from '@oracle/elements/Headline';
import PrivateRoute from '@components/shared/PrivateRoute';
import RoleType from '@interfaces/RoleType';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import UserEditForm from '@components/users/edit/Form';
import UserType from '@interfaces/UserType';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { AddUserSmileyFace } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum } from '@components/settings/Dashboard/constants';
import { USER_PASSWORD_CURRENT_FIELD_UUID } from '@components/users/edit/Form/constants';
import { dateFormatLong } from '@utils/date';
import { getUser } from '@utils/session';
import { goToWithQuery } from '@utils/routing';
import { isEqual } from '@utils/hash';
import { pauseEvent } from '@utils/events';
import { queryFromUrl } from '@utils/url';

function UsersListPage() {
  const router = useRouter();
  const {
    id: currentUserID,
    owner: isOwner,
  } = getUser() || {};
  const [query, setQuery] = useState<{
    add_new_user: boolean;
    user_id: number;
  }>(null);

  const { data, mutate: fetchUsers } = api.users.list({}, {
    revalidateOnFocus: false,
  });
  const users = useMemo(
    () => data?.users || [],
    [data?.users],
  );
  const { data: dataUser, mutate: fetchUser } = api.users.detail(query?.user_id, {}, {
    revalidateOnFocus: false,
  });
  const user = dataUser?.user;

  const q = queryFromUrl();
  const qPrev = usePrevious(q);
  useEffect(() => {
    const {
      add_new_user: addNewUser,
      user_id: userID,
    } = q;

    if (!isEqual(q, qPrev)) {
      const newQuery = { ...qPrev, ...q };

      if (userID) {
        newQuery.user_id = userID;
      } else {
        delete newQuery.user_id;
      }

      if (addNewUser) {
        newQuery.add_new_user = addNewUser;
      } else {
        delete newQuery.add_new_user;
      }

      setQuery(newQuery);
    }
  }, [
    q,
    qPrev,
  ]);

  const showAddNewUser = query?.add_new_user;
  const formMemo = useMemo(() => {
    if (showAddNewUser) {
      return (
        <Spacing p={PADDING_UNITS}>
          <UserEditForm
            newUser
            onSaveSuccess={() => {
              goToWithQuery({
                add_new_user: null,
                user_id: null,
              });
              fetchUsers();
            }}
            title="Add new user"
            user={{}}
          />
        </Spacing>
      );
    } else if (user) {
      return (
        <Spacing p={PADDING_UNITS}>
          <UserEditForm
            hideFields={[USER_PASSWORD_CURRENT_FIELD_UUID]}
            onDeleteSuccess={() => {
              goToWithQuery({
                add_new_user: null,
                user_id: null,
              });
              fetchUsers();
            }}
            onSaveSuccess={() => {
              goToWithQuery({
                add_new_user: null,
                user_id: null,
              });
              fetchUser();
              fetchUsers();
            }}
            showDelete
            title="Edit user"
            user={user}
          />
        </Spacing>
      );
    }

    return null;
  }, [
    fetchUser,
    fetchUsers,
    showAddNewUser,
    user,
  ]);

  return (
    <SettingsDashboard
      after={formMemo}
      afterHidden={!user && !showAddNewUser}
      appendBreadcrumbs
      breadcrumbs={[
        {
          bold: true,
          label: () => 'Users',
          linkProps: {
            href: '/settings/workspace/users'
          },
        },
      ]}
      title="Users"
      uuidItemSelected={SectionItemEnum.USERS}
      uuidWorkspaceSelected={SectionEnum.USER_MANAGEMENT}
    >
      {isOwner &&
        <Spacing p={PADDING_UNITS}>
          <Button
            beforeIcon={<AddUserSmileyFace />}
            onClick={() => goToWithQuery({
              add_new_user: 1,
              user_id: null,
            })}
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
        isSelectedRow={(rowIndex: number) => users[rowIndex]?.id === user?.id}
        onClickRow={(rowIndex: number) => {
          const rowUserID = users[rowIndex]?.id;
          router.push(`/settings/workspace/users/${rowUserID}`);
        }}
        rows={users.map(({
          avatar,
          created_at: createdAt,
          email,
          first_name: firstName,
          id,
          last_name: lastName,
          roles_display,
          roles_new,
          username,
        }: UserType) => {
          const sortedRoles = roles_new || [];
          sortedRoles.sort((a: RoleType, b: RoleType) => a.id - b.id);

          return [
            <Text large key="avatar" rightAligned>
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
            <Text monospace default key="created">
              {createdAt && dateFormatLong(createdAt)}
            </Text>,
          ];
        })}
        uuid="pipeline-runs"
      />
    </SettingsDashboard>
  );
}

UsersListPage.getInitialProps = async () => ({});

export default PrivateRoute(UsersListPage);
