import { useMemo } from 'react';

import BlockLayout from '@components/BlockLayout';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { UNIT } from '@oracle/styles/units/spacing';

type PipelineDashboardProps = {
  pipeline: PipelineType;
};

function PipelineDashboard({
  pipeline: pipelineProp,
}: PipelineDashboardProps) {
  const pipelineUUID = pipelineProp?.uuid;
  const { data } = api.pipelines.detail(pipelineUUID);
  const pipeline = useMemo(() => ({
    ...data?.pipeline,
    ...pipelineProp,
  }), [
    data,
    pipelineProp,
  ]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Dashboard',
        },
      ]}
      pageName={PageNameEnum.DASHBOARD}
      pipeline={pipeline}
      title={({ name }) => `${name} dashboard`}
      uuid={`${PageNameEnum.DASHBOARD}_${pipelineUUID}`}
    >
      <BlockLayout
        leftOffset={9 * UNIT}
        topOffset={HEADER_HEIGHT}
        uuid={`pipelines/${pipelineUUID}/dashboard`}
      />
    </PipelineDetailPage>
  );
}

PipelineDashboard.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PrivateRoute(PipelineDashboard);
