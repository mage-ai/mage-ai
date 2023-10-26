import PrivateRoute from '@components/shared/PrivateRoute';
import UserDetail from '@components/users/UserDetail';

type RoleDetailPageProps = {
  slug: number | string;
};

function RoleDetailPage({
  slug,
}: RoleDetailPageProps) {
  return (
    <UserDetail
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
