import Page from '@components/GlobalHooks/GlobalHookDetailPage';
import PrivateRoute from '@components/shared/PrivateRoute';

function GlobalHookDetailPage({ ...props }) {
  return (
    // @ts-ignore
    <Page {...props} />
  );
}

GlobalHookDetailPage.getInitialProps = async (ctx) => {
  const {
    operation_type: operationType,
    resource_type: resourceType,
    slug,
  }: {
    operation_type: string;
    resource_type: string;
    slug: string[],
  } = ctx.query;

  return {
    operationType,
    resourceType,
    slug: slug?.[0],
  };
};

export default PrivateRoute(GlobalHookDetailPage);
