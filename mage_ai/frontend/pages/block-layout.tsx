import BlockLayout from '@components/BlockLayout';
import PrivateRoute from '@components/shared/PrivateRoute';

function BlockLayoutPage() {
  return (
    <BlockLayout
      uuid="dashboard"
    />
  );
}

BlockLayoutPage.getInitialProps = async () => ({});

export default PrivateRoute(BlockLayoutPage);
