import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
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
import { Add } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_USERS,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';
import { USER_PASSWORD_CURRENT_FIELD_UUID } from '@components/users/edit/Form/constants';
import { getUser } from '@utils/session';
import { goToWithQuery } from '@utils/routing';
import { isEqual } from '@utils/hash';
import { queryFromUrl } from '@utils/url';

function UsersListPage() {
  const router = useRouter();
  const { id: currentUserID, owner: isOwner } = getUser() || {};
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
      uuidItemSelected={SECTION_ITEM_UUID_USERS}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >
      {isOwner &&
        <Spacing p={PADDING_UNITS}>
          <Button
            beforeIcon={<Add />}
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

      <Spacing p={PADDING_UNITS}>
        <Headline>
          Users
        </Headline>
      </Spacing>
      <Table
        columnFlex={[1, 1, 1]}
        columns={[
          {
            uuid: 'Username',
          },
          {
            uuid: 'Email',
          },
          {
            uuid: 'Role',
          },
        ]}
        isSelectedRow={(rowIndex: number) => users[rowIndex]?.id === user?.id}
        onClickRow={(rowIndex: number) => {
          const rowUserID = users[rowIndex]?.id;

          if (rowUserID === currentUserID) {
            router.push('/settings/account/profile');
          } else if (+query?.user_id === rowUserID) {
            goToWithQuery({
              user_id: null,
            });
          } else {
            goToWithQuery({
              add_new_user: null,
              user_id: rowUserID,
            });
          }
        }}
        rows={users.map(({
          email,
          roles_display,
          roles_new,
          username,
        }: UserType) => {
          const sortedRoles = roles_new || [];
          sortedRoles.sort((a: RoleType, b: RoleType) => a.id - b.id);

          return [
            <Text bold key="username">
              {username}
            </Text>,
            <Text default key="email">
              {email}
            </Text>,
            <Text default key="roles">
              {sortedRoles.length > 0 ? sortedRoles[0].name : roles_display}
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
