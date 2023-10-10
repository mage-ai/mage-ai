import PrivateRoute from '@components/shared/PrivateRoute';
import RoleDetail from '@components/Roles/RoleDetail';

type RoleDetailPageProps = {
  slug: number | string;
};

function RoleDetailPage({
  slug,
}: RoleDetailPageProps) {
  return (
    <RoleDetail
      slug={slug}
    />
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
