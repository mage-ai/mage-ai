import { useEffect } from 'react';
import { useRouter } from 'next/router';

import api from '@api';

const Home = () => {
  const router = useRouter();
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];

  const { data: dataStatus } = api.status.list();

  console.log('data status:', dataStatus);

  useEffect(() => {
    if (dataStatus) {
      let pathname = completePath;
      const manage = dataStatus.status?.['is_instance_manager'];
      if (basePath === '/') {
        pathname = manage ? '/manage' : '/pipelines';
      }
      router.replace(pathname);
    }
  }, [dataStatus]);
};

export default Home;
