import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';

import api from '@api';

const Home = () => {
  const router = useRouter();
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];

  const { data: data } = api.statuses.list();
  const dataStatus = useMemo(() => data?.statuses?.[0], [data]);

  useEffect(() => {
    if (dataStatus) {
      const manage = dataStatus?.is_instance_manager;
      let pathname = completePath;
      if (basePath === '/') {
        pathname = manage ? '/manage' : '/pipelines';
      }
      router.replace(pathname);
    }
  }, [basePath, completePath, dataStatus, router]);
};

export default Home;
