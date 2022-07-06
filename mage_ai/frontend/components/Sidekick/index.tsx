import { useCallback, useMemo, useRef } from 'react';

import BlockCharts from '@components/BlockCharts';
import BlockType, { SetEditingBlockType } from '@interfaces/BlockType';
import {
  ContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
} from './index.style';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import StatsTable, { StatRow as StatRowType } from '@components/datasets/StatsTable';
import api from '@api';
import { FULL_WIDTH_VIEWS, ViewKeyEnum } from './constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { createMetricsSample, createStatisticsSample } from './utils';
import { indexBy } from '@utils/array';

export type SidekickProps = {
  activeView?: ViewKeyEnum;
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
  pipeline: PipelineType;
  selectedBlock: BlockType;
  setSelectedBlock: (block: BlockType) => void;
  views: {
    key: string;
    label: string;
  }[];
} & SetEditingBlockType;

function Sidekick({
  activeView,
  blockRefs,
  editingBlock,
  fetchPipeline,
  pipeline,
  selectedBlock,
  setEditingBlock,
  setSelectedBlock,
}: SidekickProps) {
  const containerRef = useRef(null);
  const blockUUID = selectedBlock?.uuid;
  const pipelineUUID = pipeline?.uuid;
  const { data: blockSampleData } = api.blocks.pipelines.outputs.detail(pipelineUUID, blockUUID);
  const { data: blockAnalysis } = api.blocks.pipelines.analyses.detail(pipelineUUID, blockUUID);

  const sampleData = blockSampleData?.outputs?.[0]?.sample_data;
  const columns = sampleData?.columns || [];
  const rows = sampleData?.rows || [];
  const columnTypes = blockAnalysis?.analyses?.[0]?.metadata?.column_types || {};
  const statistics = blockAnalysis?.analyses?.[0]?.statistics || {};
  const insights = blockAnalysis?.analyses?.[0]?.insights;
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

  const {
    height: dataTableHeightInit,
    width: dataTableWidthInit,
  } = containerRef?.current?.getBoundingClientRect?.() || {};
  let dataTableHeight = 0;
  let dataTableWidth = 0;
  if (dataTableHeightInit) {
    dataTableHeight = dataTableHeightInit;
  }
  if (dataTableWidthInit) {
    dataTableWidth = dataTableWidthInit;
  }

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
    <ContainerStyle
      fullWidth={FULL_WIDTH_VIEWS.includes(activeView)}
      ref={containerRef}
    >
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
          height={dataTableHeight}
          renderColumnHeader={renderColumnHeader}
          rows={rows}
          width={dataTableWidth}
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
