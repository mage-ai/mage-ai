import { useEffect } from 'react';
import { useRouter } from 'next/router';

import PrivateRoute from '@components/shared/PrivateRoute';

const Settings = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings/workspace/preferences');
  }, [router]);
};

Settings.getInitialProps = async () => ({});

export default PrivateRoute(Settings);
