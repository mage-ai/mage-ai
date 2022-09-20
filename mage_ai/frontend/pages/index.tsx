import { useEffect } from 'react';
import Router, { useRouter } from 'next/router';

const Home = () => {
  const router = useRouter();
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];
  console.log('complete path:', completePath);
  console.log('base path:', basePath);
  let pathname = '/pipelines';
  if (basePath && basePath !== '/') {
    pathname = !basePath.includes('/pipelines')
      ? `${basePath}/pipelines`
      : basePath;
  }

  useEffect(() => {
    router.replace(pathname)
  }, []);
};

export default Home;
