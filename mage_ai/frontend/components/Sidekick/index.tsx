import React, { useCallback, useMemo, useState } from 'react';

import ApiReloader from '@components/ApiReloader';
import BlockCharts from '@components/BlockCharts';
import BlockType, {
  BlockRequestPayloadType,
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
import ErrorsType from '@interfaces/ErrorsType';
import EmptyCharts from '@oracle/icons/custom/EmptyCharts';
import Extensions, { ExtensionsProps } from '@components/PipelineDetail/Extensions';
import FeatureProfiles from '@components/datasets/FeatureProfiles';
import FileVersions from '@components/FileVersions';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalVariables from './GlobalVariables';
import KernelOutputType from '@interfaces/KernelOutputType';
import PipelineExecution from '@components/PipelineDetail/PipelineExecution';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import Secrets from './GlobalVariables/Secrets';
import SecretType from '@interfaces/SecretType';
import Spacing from '@oracle/elements/Spacing';
import StatsTable, { StatRow as StatRowType } from '@components/datasets/StatsTable';
import Text from '@oracle/elements/Text';
import Terminal from '@components/Terminal';
import VerticalNavigation from '@components/Dashboard/VerticalNavigation';
import { ALL_HEADERS_HEIGHT, ASIDE_SUBHEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { Close } from '@oracle/icons';
import {
  FULL_WIDTH_VIEWS,
  MESSAGE_VIEWS,
  VH_PERCENTAGE,
  ViewKeyEnum,
} from './constants';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN,
  get,
} from '@storage/localStorage';
import { OUTPUT_HEIGHT } from '@components/PipelineDetail/PipelineExecution/index.style';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  PaddingContainerStyle,
  SidekickContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
} from './index.style';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import {
  VERTICAL_NAVIGATION_WIDTH,
  VerticalNavigationStyle,
} from '@components/Dashboard/index.style';
import { buildNavigationItems } from './Navigation/constants';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { createMetricsSample, createStatisticsSample } from './utils';
import { indexBy } from '@utils/array';
import { isEmptyObject } from '@utils/hash';
import { useWindowSize } from '@utils/sizes';

const MAX_COLUMNS = 100;

export type SidekickProps = {
  activeView?: ViewKeyEnum;
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
  ) => Promise<any>;
  afterWidth: number;
  blockRefs?: {
    [current: string]: any;
  };
  blocks: BlockType[];
  blocksInNotebook: BlockType[];
  cancelPipeline: () => void;
  checkIfPipelineRunning: () => void;
  editingBlock: {
    upstreamBlocks: {
      block: BlockType;
      values: BlockType[];
    };
  };
  executePipeline: () => void;
  fetchFileTree: () => void;
  fetchPipeline: () => void;
  fetchSecrets: () => void;
  fetchVariables: () => void;
  insights: InsightType[][];
  interruptKernel: () => void;
  isPipelineExecuting: boolean;
  globalVariables: PipelineVariableType[];
  metadata: MetadataType;
  pipeline: PipelineType;
  pipelineMessages: KernelOutputType[];
  runningBlocks: BlockType[];
  sampleData: SampleDataType;
  secrets: SecretType[];
  selectedBlock: BlockType;
  selectedFilePath?: string;
  setActiveSidekickView?: (
    newView: ViewKeyEnum,
    pushHistory?: boolean,
  ) => void;
  setDisableShortcuts: (disableShortcuts: boolean) => void;
  setErrors: (errors: ErrorsType) => void;
  statistics: StatisticsType;
} & SetEditingBlockType & ChartsPropsShared & ExtensionsProps;

function Sidekick({
  activeView,
  addNewBlockAtIndex,
  afterWidth: afterWidthProp,
  autocompleteItems,
  blockRefs,
  blocks,
  blocksInNotebook,
  cancelPipeline,
  chartRefs,
  checkIfPipelineRunning,
  deleteBlock,
  deleteWidget,
  editingBlock,
  executePipeline,
  fetchFileTree,
  fetchPipeline,
  fetchSecrets,
  fetchVariables,
  globalVariables,
  insights,
  interruptKernel,
  isPipelineExecuting,
  messages,
  metadata,
  onChangeCallbackBlock,
  onChangeChartBlock,
  onChangeCodeBlock,
  pipeline,
  pipelineMessages,
  runBlock,
  runningBlocks,
  sampleData,
  savePipelineContent,
  secrets,
  selectedBlock,
  selectedFilePath,
  setActiveSidekickView,
  setAnyInputFocused,
  setDisableShortcuts,
  setEditingBlock,
  setErrors,
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
  const heightOffset = ALL_HEADERS_HEIGHT;
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [pipelineExecutionHidden, setPipelineExecutionHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN));

  const widthOffset = VERTICAL_NAVIGATION_WIDTH;
  const afterWidth = useMemo(() => afterWidthProp - widthOffset, [afterWidthProp, widthOffset]);

  const {
    block: blockEditing,
  } = editingBlock?.upstreamBlocks || {};

  const columns = (sampleData?.columns || []).slice(0, MAX_COLUMNS);
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
  const hasData = !!sampleData;
  const isIntegration = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [pipeline]);
  const finalOutputHeight = !(PipelineTypeEnum.STREAMING === pipeline?.type)
    ? -78   // Hide entire output area
    : (pipelineExecutionHidden ? -22 : OUTPUT_HEIGHT);

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
      blocks={blocks}
      fetchVariables={fetchVariables}
      pipeline={pipeline}
      selectedBlock={selectedBlock}
      setErrorMessages={setErrorMessages}
      variables={globalVariables}
      width={afterWidth}
    />
  ), [
    afterWidth,
    blocks,
    fetchVariables,
    globalVariables,
    pipeline,
    selectedBlock,
  ]);

  const fileVersionsMemo = useMemo(() => (
    <FileVersions
      selectedBlock={selectedBlock}
      selectedFilePath={selectedFilePath}
      setErrors={setErrors}
      width={afterWidth > SCROLLBAR_WIDTH ? afterWidth - SCROLLBAR_WIDTH : afterWidth}
    />
  ), [
    afterWidth,
    selectedBlock,
    selectedFilePath,
    setErrors,
  ]);

  const secretsMemo = useMemo(() => (
    <Secrets
      fetchSecrets={fetchSecrets}
      pipelineUUID={pipeline?.uuid}
      secrets={secrets}
      setErrorMessages={setErrorMessages}
      width={afterWidth}
    />
  ), [
    afterWidth,
    fetchSecrets,
    pipeline,
    secrets,
  ]);

  return (
    <>
      {errorMessages?.length >= 1 &&
        <Spacing mb={3} mt={2} mx={2}>
          <FlexContainer justifyContent="space-between">
            <Text bold danger>
              Errors
            </Text>
            <Button
              basic
              iconOnly
              noPadding
              onClick={() => setErrorMessages([])}
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

      <FlexContainer>
        <SidekickContainerStyle
          fullWidth={FULL_WIDTH_VIEWS.includes(activeView)}
          heightOffset={ViewKeyEnum.TERMINAL === activeView ? 0 : SCROLLBAR_WIDTH}
          onBlur={() => setDisableShortcuts(false)}
          onFocus={() => setDisableShortcuts(true)}
          widthOffset={widthOffset}
        >
          {activeView === ViewKeyEnum.TREE &&
            <ApiReloader uuid={`PipelineDetail/${pipeline?.uuid}`}>
              <>
                <DependencyGraph
                  blockRefs={blockRefs}
                  editingBlock={editingBlock}
                  enablePorts={!isIntegration}
                  fetchPipeline={fetchPipeline}
                  height={heightWindow - heightOffset - finalOutputHeight}
                  pipeline={pipeline}
                  runningBlocks={runningBlocks}
                  selectedBlock={selectedBlock}
                  setEditingBlock={setEditingBlock}
                  setErrors={setErrors}
                  setSelectedBlock={setSelectedBlock}
                />
                {!blockEditing && PipelineTypeEnum.STREAMING === pipeline?.type && (
                  <Spacing p={1}>
                    <PipelineExecution
                      cancelPipeline={cancelPipeline}
                      checkIfPipelineRunning={checkIfPipelineRunning}
                      executePipeline={executePipeline}
                      isPipelineExecuting={isPipelineExecuting}
                      pipelineExecutionHidden={pipelineExecutionHidden}
                      pipelineMessages={pipelineMessages}
                      setPipelineExecutionHidden={setPipelineExecutionHidden}
                    />
                  </Spacing>
                )}
              </>
            </ApiReloader>
          }
          {activeView === ViewKeyEnum.DATA && columns.length > 0 && (
            <DataTable
              columnHeaderHeight={
                (isEmptyObject(columnTypes)
                  && isEmptyObject(insightsByFeatureUUID)
                  && isEmptyObject(insightsOverview))
                ? 0
                : TABLE_COLUMN_HEADER_HEIGHT
              }
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
          {ViewKeyEnum.SECRETS === activeView && secretsMemo}
          {ViewKeyEnum.VARIABLES === activeView && globalVariablesMemo}
          {ViewKeyEnum.FILE_VERSIONS === activeView && (
            <ApiReloader uuid={`FileVersions/${selectedFilePath
                ? decodeURIComponent(selectedFilePath)
                : ''
              }`
            }>
              {fileVersionsMemo}
            </ApiReloader>
          )}

          {(isIntegration
            || (selectedBlock && hasData)
            || (!selectedBlock && hasData && activeView === ViewKeyEnum.DATA))
            ? null
            : (MESSAGE_VIEWS.includes(activeView) &&
              <FlexContainer
                alignItems="center"
                justifyContent="center"
                verticalHeight={VH_PERCENTAGE}
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

          {ViewKeyEnum.CHARTS === activeView && (widgets.length > 0
            ?
              <Charts
                autocompleteItems={autocompleteItems}
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
            :
              <FlexContainer
                alignItems="center"
                justifyContent="center"
                verticalHeight={VH_PERCENTAGE}
                verticalHeightOffset={heightOffset}
                width={afterWidth}
              >
                <Spacing pl={1} />
                <EmptyCharts size={358} />
                <Spacing pr={1} />
              </FlexContainer>
          )}

          {ViewKeyEnum.TERMINAL === activeView && (
            <div
              style={{
                height: '100%',
                position: 'relative',
                width: afterWidth,
              }}
            >
              <Terminal
                interruptKernel={interruptKernel}
                onFocus={() => setSelectedBlock(null)}
                width={afterWidth}
              />
            </div>
          )}

          {ViewKeyEnum.EXTENSIONS === activeView && (
            <Extensions
              addNewBlockAtIndex={addNewBlockAtIndex}
              autocompleteItems={autocompleteItems}
              blockRefs={blockRefs}
              blocks={blocks}
              blocksInNotebook={blocksInNotebook}
              deleteBlock={deleteBlock}
              fetchFileTree={fetchFileTree}
              fetchPipeline={fetchPipeline}
              interruptKernel={interruptKernel}
              messages={messages}
              onChangeCallbackBlock={onChangeCallbackBlock}
              onChangeCodeBlock={onChangeCodeBlock}
              pipeline={pipeline}
              runBlock={runBlock}
              runningBlocks={runningBlocks}
              savePipelineContent={savePipelineContent}
              selectedBlock={selectedBlock}
              setAnyInputFocused={setAnyInputFocused}
              setErrors={setErrors}
              setSelectedBlock={setSelectedBlock}
              setTextareaFocused={setTextareaFocused}
              textareaFocused={textareaFocused}
            />
          )}
        </SidekickContainerStyle>

        <VerticalNavigationStyle borderLeft>
          <VerticalNavigation
            aligned="right"
            navigationItems={buildNavigationItems({
              activeView,
              pipelineUUID: pipeline?.uuid,
              setActiveSidekickView,
            })}
          />
        </VerticalNavigationStyle>
      </FlexContainer>
    </>
  );
}

export default Sidekick;
