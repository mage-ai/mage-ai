import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PermissionDetail from '@components/Permissions/PermissionDetail';
import PermissionType from '@interfaces/PermissionType';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { BreadcrumbType } from '@components/Breadcrumbs';
import { Locked } from '@oracle/icons';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SectionEnum, SectionItemEnum, } from '@components/settings/Dashboard/constants';
import { dateFormatLong } from '@utils/date';
import { displayNames } from '@utils/models/permission';
import { pauseEvent } from '@utils/events';

function PermissionsListPage() {
  const router = useRouter();

  const [isAddingNew, setIsAddingNew] = useState(false);

  const { data } = api.permissions.list({
    _limit: 1000,
  });
  const permissions: PermissionType[] = useMemo(() => data?.permissions || [], [data]);

  const breadcrumbs: BreadcrumbType[] = [
    {
      bold: !isAddingNew,
      label: () => 'Permissions',
    },
  ];

  if (isAddingNew) {
    breadcrumbs[0].onClick = () => setIsAddingNew(false);
    breadcrumbs.push({
      bold: true,
      label: () => 'New permission',
    });
  } else {
    breadcrumbs[0].linkProps = {
      href: '/settings/workspace/permissions'
    };
  }

  return (
    <SettingsDashboard
      appendBreadcrumbs
      breadcrumbs={breadcrumbs}
      title="Permissions"
      uuidItemSelected={SectionItemEnum.PERMISSIONS}
      uuidWorkspaceSelected={SectionEnum.USER_MANAGEMENT}
    >
      {isAddingNew && <PermissionDetail contained onCancel={() => setIsAddingNew(false)} />}
      {!isAddingNew && (
        <>
          <Spacing p={PADDING_UNITS}>
            <Button
              beforeIcon={<Locked />}
              onClick={() => setIsAddingNew(true)}
              primary
            >
              Add new permission
            </Button>
          </Spacing>

          <Divider light />

          <Table
            columnFlex={[3, 1, null, 6, null, null]}
            columns={[
              {
                uuid: 'Entity',
              },
              {
                uuid: 'Subtype',
              },
              {
                uuid: 'Entity ID',
              },
              {
                uuid: 'Access',
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
              const id = permissions[rowIndex]?.id;
              router.push(`/settings/workspace/permissions/${id}`);
            }}
            rows={permissions?.map(({
              access,
              created_at: createdAt,
              entity,
              entity_id: entityID,
              entity_name: entityName,
              entity_type: entityType,
              id,
              updated_at: updatedAt,
              user,
            }) => {
              const accessDisplayNames = access ? displayNames(access) : [];
              const accessDisplayNamesCount = accessDisplayNames?.length || 0;

              return [
                <Text key="entityName" monospace>
                  {entityName || entity}
                </Text>,
                <Text default key="entityType" monospace={!!entityType}>
                  {entityType || '-'}
                </Text>,
                <Text default key="entityID" monospace={!!entityID}>
                  {entityID || '-'}
                </Text>,
                <div key="access">
                  {accessDisplayNamesCount >= 1 && (
                    <FlexContainer alignItems="center" flexWrap="wrap">
                      {accessDisplayNames?.map((displayName: string, idx: number) => (
                        <div key={displayName}>
                          <Text default monospace small>
                            {displayName}{accessDisplayNamesCount >= 2
                              && idx < accessDisplayNamesCount - 1
                              && (
                                <Text inline muted small>
                                  ,&nbsp;
                                </Text>
                              )
                            }
                          </Text>
                        </div>
                      ))}
                    </FlexContainer>
                  )}
                </div>,
                <Text monospace default key="updatedAt">
                  {updatedAt && dateFormatLong(updatedAt)}
                </Text>,
                <Text monospace default key="createdAt" rightAligned>
                  {createdAt && dateFormatLong(createdAt)}
                </Text>,
              ];
            })}
            uuid="permissions"
          />
        </>
      )}
    </SettingsDashboard>
  );
}

PermissionsListPage.getInitialProps = async () => ({});

export default PrivateRoute(PermissionsListPage);
