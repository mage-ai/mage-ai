import Router, { useRouter } from 'next/router';
import { useEffect } from 'react';

const Home = () => {
  const router = useRouter();
  const queryParams = router.query;
  const basePath = router.pathname;
  let pathname = '/datasets';
  if (basePath !== '/') {
    pathname = `${basePath}/datasets`;
  }

  useEffect(() => {
    Router.push({
      pathname,
      query: queryParams,
    });
  });
};

export default Home;
