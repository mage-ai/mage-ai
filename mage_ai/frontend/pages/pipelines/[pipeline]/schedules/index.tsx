import PipelineDetailPage from '@components/PipelineDetailPage';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';

function PipelineSchedules({
  pipeline,
}) {
  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Schedules',
        },
      ]}
      pageName={PageNameEnum.SCHEDULES}
      pipeline={pipeline}
      title={({ name }) => `${name} schedules`}
    />
  );
}

PipelineSchedules.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineSchedules;
