import Dashboard from '@components/Dashboard';
import GlobalDataProductsPageComponent from '@components/GlobalDataProducts';
import PrivateRoute from '@components/shared/PrivateRoute';

function GlobalDataProductsPage() {
  return (
    <Dashboard
      title="Global data products"
      uuid="GlobalDataProducts/index"
    >
      <GlobalDataProductsPageComponent />
    </Dashboard>
  );
}

GlobalDataProductsPage.getInitialProps = async () => ({});

export default PrivateRoute(GlobalDataProductsPage);
