import BrowseTemplates from '@components/CustomTemplates/BrowseTemplates';
import Dashboard from '@components/Dashboard';
import PrivateRoute from '@components/shared/PrivateRoute';

function Templates() {
  return (
    <Dashboard
      title="Templates"
      uuid="Templates/index"
    >
      <BrowseTemplates />
    </Dashboard>
  );
}

Templates.getInitialProps = async () => ({});

export default PrivateRoute(Templates);
