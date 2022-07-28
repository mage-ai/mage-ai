import React, { useCallback, useMemo, useState } from 'react';
import useWebSocket from 'react-use-websocket';

import BlockCharts from '@components/BlockCharts';
import BlockType, {
  InsightType,
  MetadataType,
  SampleDataType,
  SetEditingBlockType,
  StatisticsType,
} from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import Charts, { ChartsPropsShared } from './Charts';
import DataTable from '@components/DataTable';
import DependencyGraph from '@components/DependencyGraph';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalVariables from './GlobalVariables';
import PipelineExecution from '@components/PipelineDetail/PipelineExecution';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Spacing from '@oracle/elements/Spacing';
import StatsTable, { StatRow as StatRowType } from '@components/datasets/StatsTable';
import Text from '@oracle/elements/Text';

import { ASIDE_HEADER_HEIGHT, ASIDE_SUBHEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { Close } from '@oracle/icons';
import { FULL_WIDTH_VIEWS, MESSAGE_VIEWS, ViewKeyEnum } from './constants';
import { OUTPUT_HEIGHT } from '@components/PipelineDetail/PipelineExecution/index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  PaddingContainerStyle,
  SidekickContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
} from './index.style';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { createMetricsSample, createStatisticsSample } from './utils';
import { getWebSocket } from '@api/utils/url';
import { indexBy } from '@utils/array';
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
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  insights: InsightType[][];
  globalVariables: PipelineVariableType[];
  metadata: MetadataType;
  pipeline: PipelineType;
  runningBlocks: BlockType[];
  sampleData: SampleDataType;
  selectedBlock: BlockType;
  statistics: StatisticsType;
} & SetEditingBlockType & ChartsPropsShared;

function Sidekick({
  activeView,
  afterWidth,
  blockRefs,
  blocks,
  chartRefs,
  deleteWidget,
  editingBlock,
  fetchFileTree,
  fetchPipeline,
  globalVariables,
  insights,
  messages,
  metadata,
  onChangeChartBlock,
  pipeline,
  runBlock,
  runningBlocks,
  sampleData,
  savePipelineContent,
  selectedBlock,
  setAnyInputFocused,
  setEditingBlock,
  setSelectedBlock,
  setTextareaFocused,
  statistics,
  textareaFocused,
  updateWidget,
  widgets,
}: SidekickProps) {
  const {
    height: heightWindow,
  } = useWindowSize();
  const heightOffset = ASIDE_HEADER_HEIGHT;
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

  const {
    lastMessage,
    readyState,
    sendMessage,
  } = useWebSocket(getWebSocket(), {
    onOpen: () => console.log('socketUrlPublish opened'),
    shouldReconnect: (closeEvent) => {
      // Will attempt to reconnect on all close events, such as server shutting down
      console.log('Attempting to reconnect...');

      return true;
    },
  });

  const executePipeline = useCallback(() => {
    sendMessage(JSON.stringify({
      execute_pipeline: true,
      pipeline_uuid: pipelineUUID,
    }));
  }, [
    pipelineUUID,
    sendMessage,
  ]);

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
            <DependencyGraph
              blockRefs={blockRefs}
              editingBlock={editingBlock}
              fetchPipeline={fetchPipeline}
              height={heightWindow - heightOffset - OUTPUT_HEIGHT}
              pipeline={pipeline}
              runningBlocks={runningBlocks}
              selectedBlock={selectedBlock}
              setEditingBlock={setEditingBlock}
              setSelectedBlock={setSelectedBlock}
            />
            {!blockEditing && (
              <Spacing p={2}>
                <PipelineExecution
                  pipeline={pipeline}
                />
              </Spacing>
            )}
          </>
        }
        {activeView === ViewKeyEnum.DATA && columns.length > 0 && (
          <DataTable
            columnHeaderHeight={TABLE_COLUMN_HEADER_HEIGHT}
            columns={columns}
            height={heightWindow - heightOffset - ASIDE_SUBHEADER_HEIGHT}
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

        {((selectedBlock && hasData)
          || (!selectedBlock && hasData && activeView === ViewKeyEnum.DATA))
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

        {ViewKeyEnum.CHARTS === activeView && (
          <Charts
            blockRefs={blockRefs}
            blocks={blocks}
            chartRefs={chartRefs}
            deleteWidget={deleteWidget}
            fetchFileTree={fetchFileTree}
            fetchPipeline={fetchPipeline}
            messages={messages}
            onChangeChartBlock={onChangeChartBlock}
            pipeline={pipeline}
            runBlock={runBlock}
            runningBlocks={runningBlocks}
            savePipelineContent={savePipelineContent}
            selectedBlock={selectedBlock}
            setAnyInputFocused={setAnyInputFocused}
            setSelectedBlock={setSelectedBlock}
            setTextareaFocused={setTextareaFocused}
            textareaFocused={textareaFocused}
            updateWidget={updateWidget}
            widgets={widgets}
            width={afterWidth}
          />
        )}
      </SidekickContainerStyle>
    </>
  );
}

export default Sidekick;
