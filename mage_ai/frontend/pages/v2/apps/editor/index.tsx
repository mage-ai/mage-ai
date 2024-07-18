import Route from '@components/v2/Route';
import dynamic from 'next/dynamic';

function Home() {
  const AppsManager = dynamic(() => import('@components/v2/Apps/Manager'), {
    ssr: false,
  });

  return <AppsManager />;
}

export default Route(Home);
