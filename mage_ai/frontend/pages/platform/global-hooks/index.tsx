import Page from '@components/GlobalHooks/GlobalHooksPage';
import PrivateRoute from '@components/shared/PrivateRoute';

function PlatformGlobalHooksPage() {
  return (
    <Page rootProject />
  );
}

PlatformGlobalHooksPage.getInitialProps = async () => ({});

export default PrivateRoute(PlatformGlobalHooksPage);
