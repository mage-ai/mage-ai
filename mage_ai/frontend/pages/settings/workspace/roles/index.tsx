import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Link from '@oracle/elements/Link';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import PrivateRoute from '@components/shared/PrivateRoute';
import RoleDetail from '@components/Roles/RoleDetail';
import RoleType from '@interfaces/RoleType';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { BreadcrumbType } from '@components/Breadcrumbs';
import { Edit } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum, } from '@components/settings/Dashboard/constants';
import { dateFormatLong } from '@utils/date';
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

  return (
    <SettingsDashboard
      appendBreadcrumbs
      breadcrumbs={breadcrumbs}
      uuidItemSelected={SectionItemEnum.ROLES}
      uuidWorkspaceSelected={SectionEnum.WORKSPACE}
    >
      {isAddingNew && <RoleDetail />}
      {!isAddingNew && (
        <>
          <Spacing p={PADDING_UNITS}>
            <Button
              beforeIcon={<Mage8Bit />}
              onClick={() => setIsAddingNew(true)}
              primary
            >
              Add new role
            </Button>
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
                      router.push(`/settings/workspace/users/${id}`);
                    }}
                  >
                    {user?.username}
                  </Link>
                )
                : <div key="user" />,,
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
