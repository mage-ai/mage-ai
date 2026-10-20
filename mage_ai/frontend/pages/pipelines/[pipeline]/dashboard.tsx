import { useMemo } from 'react';

import BlockLayout from '@components/BlockLayout';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';
import {
  AggregationFunctionEnum,
  ChartStyleEnum,
  ChartTypeEnum,
  SortOrderEnum,
  TimeIntervalEnum,
  VARIABLE_NAME_GROUP_BY,
  VARIABLE_NAME_METRICS,
  VARIABLE_NAME_TIME_INTERVAL,
  VARIABLE_NAME_Y_SORT_ORDER,
} from '@interfaces/ChartBlockType';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { DataSourceEnum } from '@interfaces/BlockLayoutItemType';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { RunStatus } from '@interfaces/BlockRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { cleanName, randomSimpleHashGenerator } from '@utils/string';

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

  const pageBlockLayoutTemplate = useMemo(() => {
    const name1 = 'Trigger active status';
    const uuid1 = cleanName(`${name1}_${pipelineUUID}_${randomSimpleHashGenerator()}`);

    const name2 = 'Trigger types';
    const uuid2 = cleanName(`${name2}_${pipelineUUID}_${randomSimpleHashGenerator()}`);

    const name3 = 'Trigger frequency';
    const uuid3 = cleanName(`${name3}_${pipelineUUID}_${randomSimpleHashGenerator()}`);

    const name4 = 'Pipeline run status';
    const uuid4 = cleanName(`${name4}_${pipelineUUID}_${randomSimpleHashGenerator()}`);

    const name5 = 'Pipeline runs daily';
    const uuid5 = cleanName(`${name5}_${pipelineUUID}_${randomSimpleHashGenerator()}`);

    const name6 = 'Completed pipeline runs daily';
    const uuid6 = cleanName(`${name6}_${pipelineUUID}_${randomSimpleHashGenerator()}`);

    const name7 = 'Failed pipeline runs daily';
    const uuid7 = cleanName(`${name7}_${pipelineUUID}_${randomSimpleHashGenerator()}`);

    const dataSourcePipelineSchedules = {
      pipeline_uuid: pipelineUUID,
      type: DataSourceEnum.PIPELINE_SCHEDULES,
    };

    const dataSourcePipelineRuns = {
      pipeline_uuid: pipelineUUID,
      type: DataSourceEnum.PIPELINE_RUNS,
    };

    const pipelineRunsPerDayShared = {
      configuration: {
        [VARIABLE_NAME_GROUP_BY]: ['execution_date'],
        [VARIABLE_NAME_METRICS]: [
          {
            aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
            column: 'id',
          },
        ],
        [VARIABLE_NAME_TIME_INTERVAL]: TimeIntervalEnum.DAY,
        chart_type: ChartTypeEnum.TIME_SERIES_LINE_CHART,
      },
      data_source: dataSourcePipelineRuns,
      type: BlockTypeEnum.CHART,
    };

    return {
      blocks: {
        [uuid1]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: ['status'],
            [VARIABLE_NAME_METRICS]: [
              {
                aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
                column: 'id',
              },
            ],
            [VARIABLE_NAME_Y_SORT_ORDER]: SortOrderEnum.DESCENDING,
            chart_type: ChartTypeEnum.BAR_CHART,
          },
          data_source: dataSourcePipelineSchedules,
          name: name1,
          type: BlockTypeEnum.CHART,
          uuid: uuid1,
        },
        [uuid2]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: ['schedule_type'],
            chart_type: ChartTypeEnum.PIE_CHART,
          },
          data_source: dataSourcePipelineSchedules,
          name: name2,
          type: BlockTypeEnum.CHART,
          uuid: uuid2,
        },
        [uuid3]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: ['schedule_interval'],
            [VARIABLE_NAME_METRICS]: [
              {
                aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
                column: 'id',
              },
            ],
            [VARIABLE_NAME_Y_SORT_ORDER]: SortOrderEnum.DESCENDING,
            chart_style: ChartStyleEnum.HORIZONTAL,
            chart_type: ChartTypeEnum.BAR_CHART,
          },
          data_source: dataSourcePipelineSchedules,
          name: name3,
          type: BlockTypeEnum.CHART,
          uuid: uuid3,
        },
        [uuid4]: {
          configuration: {
            [VARIABLE_NAME_GROUP_BY]: ['status'],
            [VARIABLE_NAME_METRICS]: [
              {
                aggregation: AggregationFunctionEnum.COUNT_DISTINCT,
                column: 'id',
              },
            ],
            [VARIABLE_NAME_Y_SORT_ORDER]: SortOrderEnum.DESCENDING,
            chart_style: ChartStyleEnum.HORIZONTAL,
            chart_type: ChartTypeEnum.BAR_CHART,
          },
          data_source: dataSourcePipelineRuns,
          name: name4,
          type: BlockTypeEnum.CHART,
          uuid: uuid4,
        },
        [uuid5]: {
          ...pipelineRunsPerDayShared,
          name: name5,
          uuid: uuid5,
        },
        [uuid6]: {
          ...pipelineRunsPerDayShared,
      content: `
@data_source
def d(df):
    return df[df['status'] == '${RunStatus.COMPLETED}']
`,
          name: name6,
          uuid: uuid6,
        },
        [uuid7]: {
          ...pipelineRunsPerDayShared,
      content: `
@data_source
def d(df):
    return df[df['status'] == '${RunStatus.FAILED}']
`,
          name: name7,
          uuid: uuid7,
        },
      },
      layout: [
        [
          {
            block_uuid: uuid1,
            width: 1,
          },
          {
            block_uuid: uuid2,
            width: 1,
          },

          {
            block_uuid: uuid3,
            width: 2,
          },
        ],
        [
          {
            block_uuid: uuid4,
            width: 1,
          },
          {
            block_uuid: uuid5,
            width: 2,
          },
        ],
        [
          {
            block_uuid: uuid6,
            width: 1,
          },
          {
            block_uuid: uuid7,
            width: 1,
          },
        ],
      ],
    };
  }, [
    pipelineUUID,
  ]);

  const blockLayoutMemo = useMemo(() => (
    <BlockLayout
      leftOffset={9 * UNIT}
      pageBlockLayoutTemplate={pageBlockLayoutTemplate}
      topOffset={HEADER_HEIGHT}
      uuid={`pipelines/${pipelineUUID}/dashboard`}
    />
  ), [pageBlockLayoutTemplate, pipelineUUID]);

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
      {blockLayoutMemo}
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
