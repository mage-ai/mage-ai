import PermissionDetail from '@components/Permissions/PermissionDetail';
import PrivateRoute from '@components/shared/PrivateRoute';
import SettingsDashboard from '@components/settings/Dashboard';
import api from '@api';
import { SectionEnum, SectionItemEnum } from '@components/settings/Dashboard/constants';

type PermissionDetailPageProps = {
  slug: number | string;
};

function PermissionDetailPage({
  slug,
}: PermissionDetailPageProps) {
  const { data } = api.permissions.detail(slug, {}, {
    revalidateOnFocus: false,
  });
  const permission = data?.permission;

  return (
    <SettingsDashboard
      appendBreadcrumbs
      breadcrumbs={[
        {
          label: () => 'Permissions',
          linkProps: {
            href: '/settings/workspace/permissions'
          },
        },
        {
          bold: true,
          label: () => permission?.id,
        },
      ]}
      title={permission ? `Permission ${permission?.id}` : 'New permission'}
      uuidItemSelected={SectionItemEnum.PERMISSIONS}
      uuidWorkspaceSelected={SectionEnum.WORKSPACE}
    >
      {permission && <PermissionDetail permission={permission} />}
    </SettingsDashboard>
  );
}

PermissionDetailPage.getInitialProps = async (ctx) => {
  const {
    slug,
  }: {
    slug: string[],
  } = ctx.query;

  return {
    slug: slug?.[0],
  };
};

export default PrivateRoute(PermissionDetailPage);
