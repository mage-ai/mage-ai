import { useCallback, useMemo, useRef } from 'react';

import BlockType from '@interfaces/BlockType';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  ContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
  TOTAL_PADDING,
} from './index.style';
import { ViewKeyEnum } from './constants';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { indexBy } from '@utils/array';
import { usePipelineContext } from '@context/Pipeline';

export type SidekickProps = {
  activeView?: string;
  selectedBlock: BlockType;
  views: {
    key: string;
    label: string;
  }[];
};

function Sidekick({
  activeView,
  selectedBlock,
}: SidekickProps) {
  const containerRef = useRef(null);
  const blockUUID = selectedBlock?.uuid;
  const selectedPipeline = usePipelineContext();
  const pipelineUUID = selectedPipeline?.pipeline?.uuid;
  const { data: blockSampleData } = api.blocks.pipelines.outputs.detail(pipelineUUID, blockUUID);
  const { data: blockAnalysis } = api.blocks.pipelines.analyses.detail(pipelineUUID, blockUUID);

  const sampleData = blockSampleData?.outputs?.[0]?.sample_data;
  const columns = sampleData?.columns || [];
  const rows = sampleData?.rows || [];
  const columnTypes = blockAnalysis?.analyses?.[0]?.metadata?.column_types || {};
  const statistics = blockAnalysis?.analyses?.[0]?.statistics || {};
  const insights = blockAnalysis?.analyses?.[0]?.insights;
  const insightsOverview = insights?.[1] || {};
  const insightsByFeatureUUID = useMemo(() => indexBy(insights?.[0] || [], ({
    feature: {
      uuid,
    },
  }) => uuid), [
    insights,
  ]);

  const {
    height: dataTableHeightInit,
    width: dataTableWidthInit,
  } = containerRef?.current?.getBoundingClientRect?.() || {};
  let dataTableHeight = 0;
  let dataTableWidth = 0;
  if (dataTableHeightInit) {
    dataTableHeight = dataTableHeightInit - TOTAL_PADDING;
  }
  if (dataTableWidthInit) {
    dataTableWidth = dataTableWidthInit - TOTAL_PADDING;
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
    <ContainerStyle ref={containerRef}>
      {activeView === ViewKeyEnum.TREE &&
        <DependencyGraph
          pipeline={selectedPipeline?.pipeline}
          selectedBlock={selectedBlock}
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
        <Text>
          Reports
        </Text>
      }
      {activeView === ViewKeyEnum.GRAPHS &&
        <Text>
          Graphs
        </Text>
      }
    </ContainerStyle>
  );
}

export default Sidekick;
