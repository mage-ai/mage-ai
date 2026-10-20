import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ErrorsType from '@interfaces/ErrorsType';
import Headline from '@oracle/elements/Headline';
import Paginate, { ROW_LIMIT } from '@components/shared/Paginate';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import UserType from '@interfaces/UserType';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import api from '@api';
import usePrevious from '@utils/usePrevious';
import { Add } from '@oracle/icons';
import { MetaQueryEnum } from '@api/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import { displayErrorFromReadResponse } from '@api/utils/response';
import { getUser } from '@utils/session';
import { isEqual } from '@utils/hash';
import { queryFromUrl, queryString } from '@utils/url';

function UsersListPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorsType>(null);
  const { owner: isOwner } = getUser(router?.basePath) || {};
  const [query, setQuery] = useState<{
    add_new_user: boolean;
    user_id: number;
  }>(null);

  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;
  const usersRequestQuery: {
    _limit?: number;
    _offset?: number;
  } = {
    [MetaQueryEnum.LIMIT]: ROW_LIMIT,
    [MetaQueryEnum.OFFSET]: page * ROW_LIMIT,
  };
  const { data, mutate: fetchUsers } = api.users.list(
    usersRequestQuery,
    {
      revalidateOnFocus: false,
    },
  );
  const totalUsers = useMemo(() => data?.metadata?.count || [], [data]);

  useEffect(() => {
    displayErrorFromReadResponse(data, setErrors);
  }, [data]);

  const users = useMemo(
    () => data?.users || [],
    [data?.users],
  );
  const { data: dataUser, mutate: fetchUser } = api.users.detail(query?.user_id, {}, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    displayErrorFromReadResponse(dataUser, setErrors);
  }, [dataUser]);

  const user = dataUser?.user;

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
    <WorkspacesDashboard
      breadcrumbs={[
        {
          label: () => 'Workspaces',
          linkProps: {
            as: '/manage',
            href: '/manage',
          },
        },
        {
          bold: true,
          label: () => 'Users',
        },
      ]}
      errors={errors}
      pageName={WorkspacesPageNameEnum.USERS}
    >
      {isOwner &&
        <Spacing p={PADDING_UNITS}>
          <Button
            beforeIcon={<Add />}
            onClick={() => router.push('/manage/users/new')}
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

          router.push('/manage/users/[user]', `/manage/users/${rowUserID}`);
        }}
        rows={users.map(({
          email,
          roles_display,
          roles_new,
          username,
        }: UserType) => [
          <Text bold key="username">
            {username}
          </Text>,
          <Text default key="email">
            {email}
          </Text>,
          <Text default key="roles">
            {roles_new && roles_new[0] ? roles_new[0].name : roles_display}
          </Text>,
        ])}
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
              '/manage/users',
              `/manage/users?${queryString(updatedQuery)}`,
            );
          }}
          page={Number(page)}
          totalPages={Math.ceil(totalUsers / ROW_LIMIT)}
        />
      </Spacing>
    </WorkspacesDashboard>
  );
}

UsersListPage.getInitialProps = async () => ({});

export default PrivateRoute(UsersListPage);
