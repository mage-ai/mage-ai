import FilesPageComponent from '@components/Files';
import PrivateRoute from '@components/shared/PrivateRoute';

function FilesPage() {
  return (
    <FilesPageComponent />
  );
}

FilesPage.getInitialProps = async () => ({});

export default PrivateRoute(FilesPage);
