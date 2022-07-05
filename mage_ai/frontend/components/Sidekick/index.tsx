import { useCallback, useMemo } from 'react';

import BlockType from '@interfaces/BlockType';
import DataTable from '@components/DataTable';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ContainerStyle } from './index.style';
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

  const renderColumnHeader = useCallback(buildRenderColumnHeader({
    columnTypes,
    columns,
    insightsByFeatureUUID,
    insightsOverview,
    statistics,
  }), [
    columnTypes,
    columns,
    insightsByFeatureUUID,
    insightsOverview,
    statistics,
  ]);

  return (
    <ContainerStyle>
      {activeView === ViewKeyEnum.TREE &&
        <Text>
          Tree
        </Text>
      }
      {activeView === ViewKeyEnum.DATA && columns.length > 0 && (
        <DataTable
          columnHeaderHeight={150}
          columns={columns}
          height={1000}
          invalidValues={{}}
          // previewIndexes={{ removedRows: suggestionPreviewIndexes }}
          renderColumnHeader={renderColumnHeader}
          rows={rows}
          // width={dataTableWidth}
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
