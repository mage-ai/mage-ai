import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Settings from '@components/PipelineDetail/Settings';
import api from '@api';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { useMutation } from 'react-query';
import { onSuccess } from '@api/utils/response';

type PipelineSettingsProps = {
  pipeline: PipelineType;
};

function PipelineSettings({
  pipeline: pipelineProp,
}: PipelineSettingsProps) {
  const pipelineUUID = pipelineProp?.uuid;
  const { data } = api.pipelines.detail(pipelineUUID);
  const pipeline = {
    ...data?.pipeline,
    ...pipelineProp,
  };

  const [updatePipeline, { isLoading: isPipelineUpdating }] = useMutation(
    api.pipelines.useUpdate(pipelineUUID, { update_content: true }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            if (resp?.pipeline) {
              const { uuid } = resp.pipeline;

              if (pipelineUUID !== uuid) {
                window.location.href = `/pipelines/${uuid}/settings`;
              }
            }
          },
          onErrorCallback: (response, errors) => console.log({
            errors,
            response,
          }),
        },
      ),
    },
  );

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Settings',
        },
      ]}
      pageName={PageNameEnum.SETTINGS}
      pipeline={pipeline}
      title={({ name }) => `${name} settings`}
      uuid={`${PageNameEnum.SETTINGS}_${pipelineUUID}`}
    >
      {data && (
        <Settings
          isPipelineUpdating={isPipelineUpdating}
          pipeline={pipeline}
          // @ts-ignore
          updatePipeline={(data: PipelineType) => updatePipeline({
            pipeline: data,
          })}
        />
      )}
    </PipelineDetailPage>
  );
}

PipelineSettings.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PrivateRoute(PipelineSettings);
