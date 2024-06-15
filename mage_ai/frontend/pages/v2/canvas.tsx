import Route from '@components/v2/Route';
import dynamic from 'next/dynamic';

function CanvasPage() {
  const Canvas = dynamic(() => import('@components/v2/Canvas'), {
    ssr: false,
  });

  return <Canvas />;
}

export default Route(CanvasPage);
