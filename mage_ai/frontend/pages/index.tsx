import Router, { useRouter } from 'next/router';
import { useEffect } from 'react';

const Home = () => {
  const router = useRouter();
  const queryParams = router.query;
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];
  let pathname = '/datasets';
  if (basePath && basePath !== '/') {
    pathname = !basePath.includes('/datasets')
      ? `${basePath}/datasets`
      : basePath;
  }

  useEffect(() => {
    Router.push({
      pathname,
      query: queryParams,
    });
  }, []);
};

export default Home;
