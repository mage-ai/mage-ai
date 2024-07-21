import PrivateRoute from '@components/shared/PrivateRoute';
import UserDetail from '@components/users/UserDetail';

type UserDetailPageProps = {
  slug: number | string;
};

function UserDetailPage({
  slug,
}: UserDetailPageProps) {
  return (
    <UserDetail
      slug={slug}
    />
  );
}

UserDetailPage.getInitialProps = async (ctx) => {
  const {
    slug,
  }: {
    slug: string[],
  } = ctx.query;

  return {
    slug: slug?.[0],
  };
};

export default PrivateRoute(UserDetailPage);
