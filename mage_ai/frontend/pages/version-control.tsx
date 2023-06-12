import PrivateRoute from '@components/shared/PrivateRoute';
import VersionControl from '@components/VersionControl';

function VersionControlPage() {
  return (
    <VersionControl />
  );
}

VersionControlPage.getInitialProps = async () => ({});

export default PrivateRoute(VersionControlPage);
