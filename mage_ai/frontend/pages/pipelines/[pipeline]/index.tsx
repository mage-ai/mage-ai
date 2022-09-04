import { useEffect } from 'react';
import { useRouter } from 'next/router';

function PipelineDetail({
  pipeline,
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pipelines/[pipeline]/triggers', `/pipelines/${pipeline.uuid}/triggers`);
  }, []);
}

PipelineDetail.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineDetail;
