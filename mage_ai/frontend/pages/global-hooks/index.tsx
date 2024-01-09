import Page from '@components/GlobalHooks/GlobalHooksPage';
import PrivateRoute from '@components/shared/PrivateRoute';

function GlobalHooksPage() {
  return (
    <Page />
  );
}

GlobalHooksPage.getInitialProps = async () => ({});

export default PrivateRoute(GlobalHooksPage);
