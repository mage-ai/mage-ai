import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import BlockCharts from '@components/BlockCharts';
import BlockType, {
  InsightType,
  MetadataType,
  SampleDataType,
  SetEditingBlockType,
  StatisticsType,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import PipelineType from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import StatsTable, { StatRow as StatRowType } from '@components/datasets/StatsTable';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { PlayButton } from '@oracle/icons';
import {
  ContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
} from './index.style';
import { FULL_WIDTH_VIEWS, ViewKeyEnum } from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SCROLLBAR_WIDTH } from '@styles/scrollbars';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { createMetricsSample, createStatisticsSample } from './utils';
import { indexBy } from '@utils/array';
import { useWindowSize } from '@utils/sizes';
import { onError, onSuccess } from '@api/utils/response';

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
  setErrorMessages?: (errorMessages: string[]) => void;
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
  setErrorMessages,
  setSelectedBlock,
  statistics,
}: SidekickProps) {
  const {
    height: heightWindow,
  } = useWindowSize();
  const [isDisplayingSuccessMessage, setIsDisplayingSuccessMessage] = useState(false);
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

  const [executePipeline, { isLoading: isLoadingExecute }] = useMutation(
    api.execute.pipelines.useCreate(pipelineUUID),
    {
      onError: (response: any) => {
        const {
          messages,
        } = onError(response);
        setErrorMessages?.(messages);
      },
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline();
            setErrorMessages?.(null);
            setIsDisplayingSuccessMessage(true);
            setTimeout(() => {
              setIsDisplayingSuccessMessage(false);
            }, 2500);
          },
        },
      ),
    },
  );

  return (
    <ContainerStyle fullWidth={FULL_WIDTH_VIEWS.includes(activeView)}>
      {activeView === ViewKeyEnum.TREE &&
        <Spacing p={2}>
          <Button
            beforeIcon={<PlayButton inverted size={UNIT * 2}/>}
            loading={isLoadingExecute}
            onClick={() => executePipeline()}
            success
          >
            <Text
              bold
              inverted
              primary={isDisplayingSuccessMessage}
            >
              {isDisplayingSuccessMessage
                ? 'Successfully executed!'
                : 'Execute pipeline'
              }
            </Text>
          </Button>
        </Spacing>
      }
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
