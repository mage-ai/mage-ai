import Router, { useRouter } from 'next/router';
import { useEffect } from 'react';

import api from '@api';

const Home = () => {
  const router = useRouter();
  const queryParams = router.query;
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];

  const { data: pipelinesData } = api.pipelines.list();
  const pipelines = pipelinesData?.pipelines;
  let pathname = '';
  if (basePath && basePath !== '/') {
    pathname = basePath;
  } else if (pipelines?.length >= 1) {
    pathname += `/pipelines/${pipelines[0].uuid}`;
  }

  useEffect(() => {
    if (pipelines?.length >= 1) {
      Router.push({
        pathname,
        query: queryParams,
      });
    }
  }, [pathname]);
};

export default Home;
