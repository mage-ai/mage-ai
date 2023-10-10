import NextLink from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import PrivateRoute from '@components/shared/PrivateRoute';
import RoleType from '@interfaces/RoleType';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Edit } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum, } from '@components/settings/Dashboard/constants';
import { dateFormatLong } from '@utils/date';
import { pauseEvent } from '@utils/events';

function RolesListPage() {
  const router = useRouter();
  const { data } = api.roles.list();
  const roles: RoleType[] = useMemo(() => data?.roles || [], [data]);

  return (
    <SettingsDashboard
      appendBreadcrumbs
      breadcrumbs={[
        {
          bold: true,
          label: () => 'Roles',
          linkProps: {
            href: '/settings/workspace/roles'
          },
        },
      ]}
      uuidItemSelected={SectionItemEnum.ROLES}
      uuidWorkspaceSelected={SectionEnum.WORKSPACE}
    >
      <Spacing p={PADDING_UNITS}>
        <Button
          beforeIcon={<Mage8Bit />}
          onClick={() => false}
          primary
        >
          Add new role
        </Button>
      </Spacing>

      <Divider light />

      <Table
        columnFlex={[1, 1, null]}
        columns={[
          {
            uuid: 'Role',
          },
          {
            uuid: 'Created by',
          },
          {
            rightAligned: true,
            uuid: 'Created at',
          },
        ]}
        onClickRow={(rowIndex: number) => {

        }}
        rows={roles?.map(({
          created_at: createdAt,
          id,
          name,
          user,
        }) => [
          <Text key="name">
            {name}
          </Text>,
          user
            ? (
              <NextLink
                as={`/settings/workspace/users/${id}`}
                href="/settings/workspace/users/[...slug]"
                key="user"
                passHref
              >
                <Link
                  default
                >
                  {user?.username}
                </Link>
              </NextLink>
            )
            : <div key="user" />,
          <Text monospace default key="createdAt">
            {createdAt && dateFormatLong(createdAt)}
          </Text>,
        ])}
        uuid="roles"
      />
    </SettingsDashboard>
  );
}

RolesListPage.getInitialProps = async () => ({});

export default PrivateRoute(RolesListPage);
