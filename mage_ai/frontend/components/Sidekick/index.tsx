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
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalVariables from './GlobalVariables';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Spacing from '@oracle/elements/Spacing';
import StatsTable, { StatRow as StatRowType } from '@components/datasets/StatsTable';
import Text from '@oracle/elements/Text';
import api from '@api';

import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { Close, PlayButton } from '@oracle/icons';
import { FULL_WIDTH_VIEWS, MESSAGE_VIEWS, ViewKeyEnum } from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  PaddingContainerStyle,
  SidekickContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
} from './index.style';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { createMetricsSample, createStatisticsSample } from './utils';
import { indexBy } from '@utils/array';
import { onError, onSuccess } from '@api/utils/response';
import { useWindowSize } from '@utils/sizes';

export type SidekickProps = {
  activeView?: ViewKeyEnum;
  afterWidth: number;
  blockRefs?: {
    [current: string]: any;
  };
  blocks: BlockType[];
  editingBlock: {
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  };
  fetchPipeline: () => void;
  insights: InsightType[][];
  globalVariables: PipelineVariableType[];
  metadata: MetadataType;
  pipeline: PipelineType;
  runningBlocks: BlockType[];
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
  blocks,
  editingBlock,
  fetchPipeline,
  globalVariables,
  insights,
  metadata,
  pipeline,
  runningBlocks,
  sampleData,
  selectedBlock,
  setEditingBlock,
  setSelectedBlock,
  statistics,
}: SidekickProps) {
  const {
    height: heightWindow,
  } = useWindowSize();
  const heightOffset = ASIDE_HEADER_HEIGHT + SCROLLBAR_WIDTH;
  const pipelineUUID = pipeline?.uuid;
  const [isDisplayingSuccessMessage, setIsDisplayingSuccessMessage] = useState<boolean>(false);
  const [errorMessages, setErrorMessages] = useState<string[]>(null);

  const {
    block: blockEditing,
  } = editingBlock?.upstreamBlocks || {};

  const columns = sampleData?.columns || [];
  const rows = sampleData?.rows || [];
  const columnTypes = metadata?.column_types || {};
  const features = columns?.map(uuid => ({
    columnType: columnTypes[uuid],
    uuid,
  }));
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
  const hasData = sampleData && insights && Object.keys(statistics).length > 0;

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

  const globalVariablesMemo = useMemo(() => (
    <GlobalVariables
      blockRefs={blockRefs}
      blocks={blocks}
      globalVariables={globalVariables}
      setSelectedBlock={setSelectedBlock}
    />
  ), [
    blockRefs?.current,
    blocks,
    globalVariables,
    setSelectedBlock,
  ]);

  const [executePipeline, { isLoading: isLoadingExecute }] = useMutation(
    api.execute.pipelines.useCreate(pipelineUUID),
    {
      onError: (response: any) => {
        const {
          messages,
        } = onError(response);
        setErrorMessages?.(messages);
        fetchPipeline();
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
    <>
      {(activeView === ViewKeyEnum.TREE && errorMessages?.length >= 1) &&
        <Spacing mb={3} mt={2} mx={2}>
          <FlexContainer justifyContent="space-between">
            <Text bold danger>
              Errors
            </Text>
            <Button
              basic
              iconOnly
              noPadding
              onClick={() => setErrorMessages(null)}
              transparent
            >
              <Close muted />
            </Button>
          </FlexContainer>
          {errorMessages?.map((msg: string) => (
            <Spacing key={msg} pb={1}>
              <Text monospace xsmall>
                {msg}
              </Text>
            </Spacing>
          ))}
        </Spacing>
      }
      <SidekickContainerStyle fullWidth={FULL_WIDTH_VIEWS.includes(activeView)}>
        {activeView === ViewKeyEnum.TREE &&
          <>
            {!blockEditing && (
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
            )}

            <DependencyGraph
              blockRefs={blockRefs}
              editingBlock={editingBlock}
              fetchPipeline={fetchPipeline}
              pipeline={pipeline}
              runningBlocks={runningBlocks}
              selectedBlock={selectedBlock}
              setEditingBlock={setEditingBlock}
              setSelectedBlock={setSelectedBlock}
            />
          </>
        }
        {activeView === ViewKeyEnum.DATA && columns.length > 0 && (
          <DataTable
            columnHeaderHeight={TABLE_COLUMN_HEADER_HEIGHT}
            columns={columns}
            height={heightWindow - heightOffset}
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
          <PaddingContainerStyle noPadding={!selectedBlock || !hasData}>
            <FlexContainer flexDirection="column" fullWidth>
              {qualityMetrics && (
                <StatsTable
                  stats={qualityMetrics}
                  title="Quality metrics"
                />
              )}
              {statsSample && (
                <Spacing mt={PADDING_UNITS}>
                  <StatsTable
                    stats={statsSample}
                    title="Statistics"
                  />
                </Spacing>
              )}
              {features.length > 0 && (
                <Spacing mt={PADDING_UNITS}>
                  <FeatureProfiles
                    features={features}
                    statistics={statistics}
                  />
                </Spacing>
              )}
            </FlexContainer>
          </PaddingContainerStyle>
        }
        {activeView === ViewKeyEnum.GRAPHS &&
          <PaddingContainerStyle noPadding={!selectedBlock || !hasData}>
            <BlockCharts
              afterWidth={afterWidth}
              features={features}
              insightsOverview={insightsOverview}
              statistics={statistics}
            />
          </PaddingContainerStyle>
        }
        {ViewKeyEnum.VARIABLES === activeView && globalVariables && globalVariablesMemo}

        {(selectedBlock && hasData)
          ? null
          : (MESSAGE_VIEWS.includes(activeView) &&
            <FlexContainer
              alignItems="center"
              justifyContent="center"
              verticalHeight={90}
              verticalHeightOffset={heightOffset}
              width={afterWidth}
            >
              <Text
                center
                default
                disableWordBreak
                large
                monospace
              >
                {!selectedBlock
                  ? 'Select a block for insights'
                  : (!hasData && 'No data or insights available')
                }
              </Text>
            </FlexContainer>
          )
        }
      </SidekickContainerStyle>
    </>
  );
}

export default Sidekick;
