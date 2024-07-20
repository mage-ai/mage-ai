import PrivateRoute from '@components/shared/PrivateRoute';
import dynamic from 'next/dynamic';
import { LayoutVersionEnum } from '@utils/layouts';

function EditorApp() {
  const AppsManager = dynamic(() => import('@components/v2/Apps/Manager'), {
    ssr: false,
  });

  return <AppsManager />;
}

EditorApp.getInitialProps = async () => ({
  version: LayoutVersionEnum.V2,
});

export default PrivateRoute(EditorApp);
