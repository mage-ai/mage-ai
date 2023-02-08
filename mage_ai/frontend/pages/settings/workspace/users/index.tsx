import { useEffect, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import Headline from '@oracle/elements/Headline';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import UserType from '@interfaces/UserType';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { Add } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  SECTION_ITEM_UUID_USERS,
  SECTION_UUID_WORKSPACE,
} from '@components/settings/Dashboard/constants';
import { goToWithQuery } from '@utils/routing';
import { isEqual } from '@utils/hash';
import { queryFromUrl } from '@utils/url';

function UsersListPage() {
  const [query, setQuery] = useState<{
    add_new_user: boolean;
    user_id: number;
  }>(null);

  const { data } = api.users.list({}, {
    revalidateOnFocus: false,
  });
  const users = useMemo(() => data?.users || [], [data]);
  const { data: dataUser } = api.users.detail(query?.user_id, {}, {
    revalidateOnFocus: false,
  });
  const user = useMemo(() => dataUser?.user, [dataUser]);

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

  return (
    <SettingsDashboard
      uuidItemSelected={SECTION_ITEM_UUID_USERS}
      uuidWorkspaceSelected={SECTION_UUID_WORKSPACE}
    >
      <Spacing p={PADDING_UNITS}>
        <Button
          beforeIcon={<Add />}
          bold
          onClick={() => goToWithQuery({
            add_new_user: 1,
            user_id: null,
          })}
          primary
        >
          Add new user
        </Button>
      </Spacing>

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
        onClickRow={(rowIndex: number) => goToWithQuery({
          add_new_user: null,
          user_id: users[rowIndex]?.id,
        })}
        rows={users.map(({
          email,
          roles_display,
          username,
        }: UserType) => [
          <Text bold key="username">
            {username}
          </Text>,
          <Text default key="email">
            {email}
          </Text>,
          <Text default key="roles">
            {roles_display}
          </Text>,
        ])}
        uuid="pipeline-runs"
      />
    </SettingsDashboard>
  );
}

UsersListPage.getInitialProps = async () => ({});

export default PrivateRoute(UsersListPage);
