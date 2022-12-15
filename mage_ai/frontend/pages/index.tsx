import { useEffect } from 'react';
import { useRouter } from 'next/router';

import api from '@api';

const Home = () => {
  const router = useRouter();
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];

  const { data: dataStatus } = api.status.list();
  const manage = dataStatus?.status?.['is_instance_manager'];

  let pathname = completePath;
  if (basePath === '/') {
    pathname = manage ? '/manage' : '/pipelines';
  }

  console.log('data status:', dataStatus);

  // useEffect(() => {
  //   if (dataStatus) {
  //     router.replace(pathname);
  //   }
  // }, [dataStatus]);
};

export default Home;
