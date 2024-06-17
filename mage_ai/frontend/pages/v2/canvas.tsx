import Route from '@components/v2/Route';
import dynamic from 'next/dynamic';

function CanvasPage() {
  const PipelineBuilder = dynamic(() => import('@components/v2/Apps/PipelineBuilder'), {
    ssr: false,
  });

  return <PipelineBuilder />;
}

export default Route(CanvasPage);
