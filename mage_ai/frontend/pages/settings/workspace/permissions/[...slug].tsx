import PermissionDetail from '@components/Permissions/PermissionDetail';
import PrivateRoute from '@components/shared/PrivateRoute';

type PermissionDetailPageProps = {
  slug: number | string;
};

function PermissionDetailPage({
  slug,
}: PermissionDetailPageProps) {
  return (
    <PermissionDetail slug={slug} />
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
