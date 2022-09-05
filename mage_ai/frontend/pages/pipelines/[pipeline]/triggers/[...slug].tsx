import TriggerDetail from '@components/Triggers/Detail';
import TriggerEdit from '@components/Triggers/Edit';
import api from '@api';
import { PAGE_NAME_EDIT } from '@components/PipelineDetail/constants';

type TriggerDetailPageProps = {
  pipelineScheduleId?: string;
  pipelineUUID: string;
  subpath: string;
};

function TriggerDetailPage({
  pipelineScheduleId,
  pipelineUUID,
  subpath,
}: TriggerDetailPageProps) {
  const {
    data: dataGlobalVariables,
  } = api.variables.pipelines.list(pipelineUUID);
  const globalVariables = dataGlobalVariables?.variables;

  const {
    data: pipelineScheduleData,
    mutate: fetchPipelineSchedule,
  } = api.pipeline_schedules.detail(pipelineScheduleId);
  const pipelineSchedule = pipelineScheduleData?.pipeline_schedule;

  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID);
  const pipeline = {
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  };

  if (PAGE_NAME_EDIT === subpath) {
    return (
      <TriggerEdit
        fetchPipelineSchedule={fetchPipelineSchedule}
        pipeline={pipeline}
        pipelineSchedule={pipelineSchedule}
        variables={globalVariables}
      />
    );
  }

  return (
    <TriggerDetail
      fetchPipelineSchedule={fetchPipelineSchedule}
      pipeline={pipeline}
      pipelineSchedule={pipelineSchedule}
      variables={globalVariables}
    />
  );
}

TriggerDetailPage.getInitialProps= async(ctx: any) => {
  const {
    pipeline: pipelineUUID,
    slug: slugArray,
  }: {
    pipeline: string,
    pipeline_run_id: number;
    slug: string[],
  } = ctx.query;

  if (Array.isArray(slugArray)) {
    const [pipelineScheduleId, subpath] = slugArray;
;
    return {
      pipelineScheduleId,
      pipelineUUID,
      subpath,
    };
  }

  return {
    pipelineUUID,
  };
}

export default TriggerDetailPage;
