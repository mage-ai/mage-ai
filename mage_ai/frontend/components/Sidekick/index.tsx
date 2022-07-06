import { useCallback, useMemo } from 'react';

import BlockCharts from '@components/BlockCharts';
import BlockType, {
  InsightType,
  MetadataType,
  SampleDataType,
  SetEditingBlockType,
  StatisticsType,
} from '@interfaces/BlockType';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import StatsTable, { StatRow as StatRowType } from '@components/datasets/StatsTable';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import {
  ContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
} from './index.style';
import { FULL_WIDTH_VIEWS, ViewKeyEnum } from './constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@styles/scrollbars';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { createMetricsSample, createStatisticsSample } from './utils';
import { indexBy } from '@utils/array';
import { useWindowSize } from '@utils/sizes';

export type SidekickProps = {
  activeView?: ViewKeyEnum;
  afterWidth: number;
  blockRefs?: {
    [current: string]: any;
  };
  editingBlock: {
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  };
  fetchPipeline: () => void;
  insights: InsightType[][];
  metadata: MetadataType;
  pipeline: PipelineType;
  sampleData: SampleDataType;
  selectedBlock: BlockType;
  setSelectedBlock: (block: BlockType) => void;
  statistics: StatisticsType;
  views: {
    key: string;
    label: string;
  }[];
} & SetEditingBlockType;

function Sidekick({
  activeView,
  afterWidth,
  blockRefs,
  editingBlock,
  fetchPipeline,
  insights,
  metadata,
  pipeline,
  sampleData,
  selectedBlock,
  setEditingBlock,
  setSelectedBlock,
  statistics,
}: SidekickProps) {
  const {
    height: heightWindow,
  } = useWindowSize();
  const blockUUID = selectedBlock?.uuid;
  const pipelineUUID = pipeline?.uuid;

  const columns = sampleData?.columns || [];
  const rows = sampleData?.rows || [];
  const columnTypes = metadata?.column_types || {};
  const features = insights?.[0]?.map(({ feature }) => feature) || [];
  const insightsOverview = insights?.[1] || {};
  const insightsByFeatureUUID = useMemo(() => indexBy(insights?.[0] || [], ({
    feature: {
      uuid,
    },
  }) => uuid), [
    insights,
  ]);

  const qualityMetrics: StatRowType[] = createMetricsSample({ statistics });
  const statsSample: StatRowType[] = createStatisticsSample({
    columnTypes,
    statistics,
  });

  const renderColumnHeader = useCallback(buildRenderColumnHeader({
    columnTypes,
    columns,
    insightsByFeatureUUID,
    insightsOverview,
    noColumnLinks: true,
    statistics,
  }), [
    columnTypes,
    columns,
    insightsByFeatureUUID,
    insightsOverview,
    statistics,
  ]);

  return (
    <ContainerStyle fullWidth={FULL_WIDTH_VIEWS.includes(activeView)}>
      {activeView === ViewKeyEnum.TREE &&
        <DependencyGraph
          blockRefs={blockRefs}
          editingBlock={editingBlock}
          fetchPipeline={fetchPipeline}
          pipeline={pipeline}
          selectedBlock={selectedBlock}
          setEditingBlock={setEditingBlock}
          setSelectedBlock={setSelectedBlock}
        />
      }
      {activeView === ViewKeyEnum.DATA && columns.length > 0 && (
        <DataTable
          columnHeaderHeight={TABLE_COLUMN_HEADER_HEIGHT}
          columns={columns}
          height={heightWindow - (ASIDE_HEADER_HEIGHT + SCROLLBAR_WIDTH)}
          noBorderBottom
          noBorderLeft
          noBorderRight
          noBorderTop
          renderColumnHeader={renderColumnHeader}
          rows={rows}
          width={afterWidth}
        />
      )}
      {activeView === ViewKeyEnum.REPORTS &&
        <Spacing p={2}>
          <FlexContainer flexDirection="column" fullWidth>
            {qualityMetrics && (
              <StatsTable
                stats={qualityMetrics}
                title="Quality metrics"
              />
            )}
            <Spacing mb={PADDING_UNITS} />
            {statsSample && (
              <StatsTable
                stats={statsSample}
                title="Statistics"
              />
            )}
          </FlexContainer>
        </Spacing>
      }
      {activeView === ViewKeyEnum.GRAPHS &&
        <BlockCharts
          features={features}
          insightsOverview={insightsOverview}
          statistics={statistics}
        />
      }
    </ContainerStyle>
  );
}

export default Sidekick;
