import PrivateRoute from '@components/shared/PrivateRoute';
import RoleDetail from '@components/Roles/RoleDetail';
import SettingsDashboard from '@components/settings/Dashboard';
import api from '@api';
import { SectionEnum, SectionItemEnum } from '@components/settings/Dashboard/constants';

type RoleDetailPageProps = {
  slug: number | string;
};

function RoleDetailPage({
  slug,
}: RoleDetailPageProps) {
  const { data } = api.roles.detail(slug, {}, {
    revalidateOnFocus: false,
  });
  const role = data?.role;

  return (
    <SettingsDashboard
      appendBreadcrumbs
      breadcrumbs={[
        {
          label: () => 'Roles',
          linkProps: {
            href: '/settings/workspace/roles'
          },
        },
        {
          bold: true,
          label: () => role?.name,
        },
      ]}
      uuidItemSelected={SectionItemEnum.ROLES}
      uuidWorkspaceSelected={SectionEnum.WORKSPACE}
    >
      <RoleDetail role={role} />
    </SettingsDashboard>
  );
}

RoleDetailPage.getInitialProps = async (ctx) => {
  const {
    slug,
  }: {
    slug: string[],
  } = ctx.query;

  return {
    slug: slug?.[0],
  };
};

export default PrivateRoute(RoleDetailPage);
