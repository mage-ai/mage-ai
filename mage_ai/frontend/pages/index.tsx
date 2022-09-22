import { useEffect } from 'react';
import { useRouter } from 'next/router';

const Home = () => {
  const router = useRouter();
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];

  let pathname = completePath;
  if (basePath === '/') {
    pathname = '/pipelines';
  }

  useEffect(() => {
    router.replace(pathname);
  }, []);
};

export default Home;
