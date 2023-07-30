import GlobalDataProductsPageComponent from '@components/GlobalDataProducts';
import PrivateRoute from '@components/shared/PrivateRoute';

function GlobalDataProductsPage() {
  return (
    <GlobalDataProductsPageComponent />
  );
}

GlobalDataProductsPage.getInitialProps = async () => ({});

export default PrivateRoute(GlobalDataProductsPage);
