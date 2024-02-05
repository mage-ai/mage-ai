import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CanvasRef } from 'reaflow';

import ApiReloader from '@components/ApiReloader';
import BlockSettings from '@components/BlockSettings';
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
import FileType from '@interfaces/FileType';
import FileVersions from '@components/FileVersions';
import FlexContainer from '@oracle/components/FlexContainer';
import GlobalDataProductType from '@interfaces/GlobalDataProductType';
import GlobalVariables from './GlobalVariables';
import InteractionType from '@interfaces/InteractionType';
import KernelOutputType from '@interfaces/KernelOutputType';
import PipelineExecution from '@components/PipelineDetail/PipelineExecution';
import PipelineInteractionType, {
  BlockInteractionType,
  InteractionPermission,
  InteractionPermissionWithUUID,
} from '@interfaces/PipelineInteractionType';
import PipelineInteractions from '@components/PipelineInteractions';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import PipelineVariableType from '@interfaces/PipelineVariableType';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Secrets from './GlobalVariables/Secrets';
import SecretType from '@interfaces/SecretType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Terminal from '@components/Terminal';
import { ALL_HEADERS_HEIGHT, ASIDE_SUBHEADER_HEIGHT } from '@components/TripleLayout/index.style';
import {
  Charts as ChartsIcon,
  Close,
  SettingsWithKnobs,
} from '@oracle/icons';
import {
  MESSAGE_VIEWS,
  VH_PERCENTAGE,
  ViewKeyEnum,
} from './constants';
import { VERTICAL_NAVIGATION_WIDTH } from '@components/Dashboard/index.style';
import { LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN, get } from '@storage/localStorage';
import { OpenDataIntegrationModalType } from '@components/DataIntegrationModal/constants';
import { OUTPUT_HEIGHT } from '@components/PipelineDetail/PipelineExecution/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  SidekickContainerStyle,
  TABLE_COLUMN_HEADER_HEIGHT,
} from './index.style';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { buildRenderColumnHeader } from '@components/datasets/overview/utils';
import { indexBy } from '@utils/array';
import { isEmptyObject } from '@utils/hash';
import { scrollToBlock } from '@components/PipelineDetail/ColumnScroller/utils';
import { useWindowSize } from '@utils/sizes';
import AddonBlocks from '@components/PipelineDetail/AddonBlocks';

const MAX_COLUMNS = 100;

export type SidekickProps = {
  activeView?: ViewKeyEnum;
  addNewBlockAtIndex: (
    block: BlockRequestPayloadType,
    idx: number,
    onCreateCallback?: (block: BlockType) => void,
    name?: string,
    isReplacingBlock?: boolean,
  ) => Promise<any>;
  afterWidth: number;
  blockInteractionsMapping: {
    [blockUUID: string]: BlockInteractionType[];
  };
  blockRefs?: {
    [current: string]: any;
  };
  blocks: BlockType[];
  blocksInNotebook: BlockType[];
  cancelPipeline: () => void;
  checkIfPipelineRunning: () => void;
  containerHeightOffset?: number;
  contentByBlockUUID?: any;
  createInteraction: (opts: {
    interaction: InteractionType;
  }) => void;
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
  globalDataProducts?: GlobalDataProductType[];
  globalVariables: PipelineVariableType[];
  insights: InsightType[][];
  interactions: InteractionType[];
  interactionsMapping: {
    [interactionUUID: string]: InteractionType;
  };
  interruptKernel: () => void;
  isLoadingCreateInteraction?: boolean;
  isLoadingUpdatePipelineInteraction?: boolean;
  isPipelineExecuting: boolean;
  lastTerminalMessage: WebSocketEventMap['message'] | null;
  metadata: MetadataType;
  onUpdateFileSuccess?: (fileContent: FileType, opts?: {
    blockUUID: string;
  }) => void;
  permissions?: InteractionPermission[] | InteractionPermissionWithUUID[];
  pipeline: PipelineType;
  pipelineInteraction: PipelineInteractionType;
  pipelineMessages: KernelOutputType[];
  project?: ProjectType;
  refAfterFooter?: any;
  runningBlocks: BlockType[];
  sampleData: SampleDataType;
  savePipelineInteraction?: () => void;
  secrets: SecretType[];
  selectedBlock: BlockType;
  selectedFilePath?: string;
  sendTerminalMessage: (message: string, keep?: boolean) => void;
  setActiveSidekickView: (
    newView: ViewKeyEnum,
    pushHistory?: boolean,
  ) => void;
  setAllowCodeBlockShortcuts?: (allowCodeBlockShortcuts: boolean) => void;
  setBlockInteractionsMapping: (prev: any) => {
    [blockUUID: string]: BlockInteractionType[];
  };
  setDisableShortcuts: (disableShortcuts: boolean) => void;
  setHiddenBlocks: ((opts: {
    [uuid: string]: BlockType;
  }) => {
    [uuid: string]: BlockType;
  });
  setErrors: (errors: ErrorsType) => void;
  setInteractionsMapping: (prev: any) => {
    [interactionUUID: string]: InteractionType;
  };
  setPermissions?: (prev: any) => void;
  sideBySideEnabled?: boolean;
  statistics: StatisticsType;
  treeRef?: { current?: CanvasRef };
  updatePipelineInteraction?: (opts: {
    pipeline_interaction: PipelineInteractionType;
  }) => void;
} & SetEditingBlockType & ChartsPropsShared & ExtensionsProps & OpenDataIntegrationModalType;

function Sidekick({
  activeView,
  addNewBlockAtIndex,
  afterWidth: afterWidthProp,
  autocompleteItems,
  blockInteractionsMapping,
  blockRefs,
  blocks,
  blocksInNotebook,
  cancelPipeline,
  chartRefs,
  checkIfPipelineRunning,
  containerHeightOffset,
  contentByBlockUUID,
  createInteraction,
  deleteBlock,
  deleteWidget,
  editingBlock,
  executePipeline,
  fetchFileTree,
  fetchPipeline,
  fetchSecrets,
  fetchVariables,
  globalDataProducts,
  globalVariables,
  insights,
  interactions,
  interactionsMapping,
  interruptKernel,
  isLoadingCreateInteraction,
  isLoadingUpdatePipelineInteraction,
  isPipelineExecuting,
  lastTerminalMessage,
  messages,
  metadata,
  onChangeCallbackBlock,
  onChangeChartBlock,
  onChangeCodeBlock,
  onSelectBlockFile,
  onUpdateFileSuccess,
  permissions,
  pipeline,
  pipelineInteraction,
  pipelineMessages,
  project,
  refAfterFooter,
  runBlock,
  runningBlocks,
  sampleData,
  savePipelineContent,
  savePipelineInteraction,
  secrets,
  selectedBlock,
  selectedFilePath,
  sendTerminalMessage,
  setActiveSidekickView,
  setAllowCodeBlockShortcuts,
  setAnyInputFocused,
  setBlockInteractionsMapping,
  setDisableShortcuts,
  setEditingBlock,
  setErrors,
  setHiddenBlocks,
  setInteractionsMapping,
  setPermissions,
  setSelectedBlock,
  setTextareaFocused,
  showBrowseTemplates,
  showDataIntegrationModal,
  showUpdateBlockModal,
  sideBySideEnabled,
  statistics,
  textareaFocused,
  treeRef,
  updatePipelineInteraction,
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

  const afterWidth = useMemo(() => afterWidthProp - (VERTICAL_NAVIGATION_WIDTH + 1), [
    afterWidthProp,
  ]);

  const isInteractionsEnabled =
    useMemo(() => !!project?.features?.[FeatureUUIDEnum.INTERACTIONS], [
      project?.features,
    ]);

  const {
    block: blockEditing,
  } = editingBlock?.upstreamBlocks || {};

  const columns = (sampleData?.columns || []).slice(0, MAX_COLUMNS);
  const rows = useMemo(() => sampleData?.rows || [], [sampleData]);
  const columnTypes = useMemo(() => metadata?.column_types || {}, [metadata]);
  const insightsOverview = useMemo(() => insights?.[1] || {}, [insights]);
  const insightsByFeatureUUID = useMemo(() => indexBy(insights?.[0] || [], ({
    feature: {
      uuid,
    },
  }) => uuid), [
    insights,
  ]);

  const hasData = !!sampleData;
  const isIntegration = useMemo(() => PipelineTypeEnum.INTEGRATION === pipeline?.type, [pipeline]);
  const finalOutputHeight = !(PipelineTypeEnum.STREAMING === pipeline?.type)
    ? -70   // Hide entire output area
    : (pipelineExecutionHidden ? -16 : OUTPUT_HEIGHT);

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
      onActionCallback={onUpdateFileSuccess}
      pipeline={pipeline}
      selectedBlock={selectedBlock}
      selectedFilePath={selectedFilePath}
      setErrors={setErrors}
      width={afterWidth > SCROLLBAR_WIDTH ? afterWidth - SCROLLBAR_WIDTH : afterWidth}
    />
  ), [
    afterWidth,
    onUpdateFileSuccess,
    pipeline,
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

  const extensionsAndAddonsProps = useMemo(() => ({
    addNewBlockAtIndex,
    autocompleteItems,
    blockRefs,
    blocks,
    blocksInNotebook,
    deleteBlock,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    messages,
    onChangeCallbackBlock,
    onChangeCodeBlock,
    onSelectBlockFile,
    pipeline,
    runBlock,
    runningBlocks,
    savePipelineContent,
    selectedBlock,
    setAnyInputFocused,
    setErrors,
    setHiddenBlocks,
    setSelectedBlock,
    setTextareaFocused,
    showBrowseTemplates,
    showUpdateBlockModal,
    textareaFocused,
  }), [
    addNewBlockAtIndex,
    autocompleteItems,
    blockRefs,
    blocks,
    blocksInNotebook,
    deleteBlock,
    fetchFileTree,
    fetchPipeline,
    interruptKernel,
    messages,
    onChangeCallbackBlock,
    onChangeCodeBlock,
    onSelectBlockFile,
    pipeline,
    runBlock,
    runningBlocks,
    savePipelineContent,
    selectedBlock,
    setAnyInputFocused,
    setErrors,
    setHiddenBlocks,
    setSelectedBlock,
    setTextareaFocused,
    showBrowseTemplates,
    showUpdateBlockModal,
    textareaFocused,
  ]);

  const dataMemo = useMemo(() => columns.length > 0 && (
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
  ), [
    afterWidth,
    columnTypes,
    columns,
    heightOffset,
    heightWindow,
    insightsByFeatureUUID,
    insightsOverview,
    renderColumnHeader,
    rows,
  ]);

  const chartsMemo = useMemo(() => widgets.length > 0 && (
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
      setErrors={setErrors}
      setSelectedBlock={setSelectedBlock}
      setTextareaFocused={setTextareaFocused}
      textareaFocused={textareaFocused}
      updateWidget={updateWidget}
      widgets={widgets}
      width={afterWidth}
    />
  ), [
    afterWidth,
    autocompleteItems,
    blockRefs,
    blocks,
    chartRefs,
    deleteWidget,
    fetchFileTree,
    fetchPipeline,
    messages,
    onChangeChartBlock,
    pipeline,
    runBlock,
    runningBlocks,
    savePipelineContent,
    selectedBlock,
    setAnyInputFocused,
    setErrors,
    setSelectedBlock,
    setTextareaFocused,
    textareaFocused,
    updateWidget,
    widgets,
  ]);

  const terminalMemo = useMemo(() => (
    <div
      style={{
        height: '100%',
        position: 'relative',
        width: afterWidth,
      }}
    >
      <Terminal
        lastMessage={lastTerminalMessage}
        onFocus={() => setSelectedBlock(null)}
        sendMessage={sendTerminalMessage}
        width={afterWidth}
      />
    </div>
  ), [
    afterWidth,
    lastTerminalMessage,
    sendTerminalMessage,
    setSelectedBlock,
  ]);

  const extensionsMemo = useMemo(() => (
    <Extensions
      {...extensionsAndAddonsProps}
    />
  ), [extensionsAndAddonsProps]);

  const addonMemo = useMemo(() => (
    <AddonBlocks
      {...extensionsAndAddonsProps}
    />
  ), [extensionsAndAddonsProps]);

  const blockSettingsMemo = useMemo(() => pipeline && selectedBlock && (
    <BlockSettings
      addNewBlockAtIndex={addNewBlockAtIndex}
      block={selectedBlock}
      contentByBlockUUID={contentByBlockUUID}
      fetchFileTree={fetchFileTree}
      fetchPipeline={fetchPipeline}
      globalDataProducts={globalDataProducts}
      pipeline={pipeline}
      project={project}
      setSelectedBlock={setSelectedBlock}
      showDataIntegrationModal={showDataIntegrationModal}
      showUpdateBlockModal={showUpdateBlockModal}
    />
  ), [
    addNewBlockAtIndex,
    contentByBlockUUID,
    fetchFileTree,
    fetchPipeline,
    globalDataProducts,
    pipeline,
    project,
    selectedBlock,
    setSelectedBlock,
    showDataIntegrationModal,
    showUpdateBlockModal,
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

      <SidekickContainerStyle
        fullWidth
        heightOffset={(ViewKeyEnum.TERMINAL === activeView || activeView === ViewKeyEnum.TREE)
          ? 0
          : containerHeightOffset
            ? containerHeightOffset
            : SCROLLBAR_WIDTH
        }
        onBlur={() => {
          if (!selectedFilePath) {
            setDisableShortcuts(false);
          }
          setAllowCodeBlockShortcuts?.(false);
        }}
        onFocus={() => {
          setDisableShortcuts(true);
          if (activeView === ViewKeyEnum.TREE) {
            setAllowCodeBlockShortcuts?.(true);
          }
        }}
        overflowHidden={activeView === ViewKeyEnum.TREE}
        tabIndex={0} // Make this div a focusable element
      >
        {activeView === ViewKeyEnum.TREE &&
          <ApiReloader uuid={`PipelineDetail/${pipeline?.uuid}`}>
            <>
              <DependencyGraph
                addNewBlockAtIndex={addNewBlockAtIndex}
                blockRefs={blockRefs}
                blocks={blocks}
                contentByBlockUUID={contentByBlockUUID}
                contextMenuEnabled
                deleteBlock={deleteBlock}
                dragEnabled
                editingBlock={editingBlock}
                enablePorts={!isIntegration}
                fetchPipeline={fetchPipeline}
                height={heightWindow - (heightOffset - SCROLLBAR_WIDTH) - finalOutputHeight}
                messages={messages}
                // @ts-ignore
                onClickNode={({ block: { uuid } }) => setHiddenBlocks((prev) => {
                  const hidden = !!prev?.[uuid];

                  if (!hidden) {
                    return prev;
                  }

                  return {
                    ...prev,
                    [uuid]: !hidden,
                  };
                })}
                pipeline={pipeline}
                runBlock={runBlock}
                runningBlocks={runningBlocks}
                selectedBlock={selectedBlock}
                setActiveSidekickView={setActiveSidekickView}
                setEditingBlock={setEditingBlock}
                setErrors={setErrors}
                setSelectedBlock={(block) => {
                  setSelectedBlock(block);

                  if (sideBySideEnabled) {
                    scrollToBlock(block);
                  }
                }}
                showUpdateBlockModal={showUpdateBlockModal}
                treeRef={treeRef}
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

        {activeView === ViewKeyEnum.DATA && dataMemo}

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
          ? chartsMemo
          : (
            <FlexContainer
              alignItems="center"
              flexDirection="column"
              justifyContent="center"
              verticalHeight={VH_PERCENTAGE}
              verticalHeightOffset={heightOffset}
              width={afterWidth}
            >
              <Spacing px={1}>
                <FlexContainer flexDirection="row">
                  <Text center default>
                    Add a chart by clicking the chart icon
                    &nbsp;<ChartsIcon size={UNIT * 1.5} />&nbsp;in
                    <br />
                    the top right corner of a block (if applicable).
                  </Text>
                </FlexContainer>
              </Spacing>
              <Spacing mt={PADDING_UNITS} px={1}>
                <EmptyCharts size={UNIT * 40} />
              </Spacing>
            </FlexContainer>
          )
        )}

        {ViewKeyEnum.TERMINAL === activeView && terminalMemo}

        {ViewKeyEnum.EXTENSIONS === activeView && extensionsMemo}

        {ViewKeyEnum.ADDON_BLOCKS === activeView && addonMemo}

        {ViewKeyEnum.BLOCK_SETTINGS === activeView && (selectedBlock
          ? blockSettingsMemo
          : (
            <FlexContainer
              alignItems="center"
              flexDirection="column"
              justifyContent="center"
              verticalHeight={VH_PERCENTAGE}
              verticalHeightOffset={heightOffset}
              width={afterWidth}
            >
              <Spacing px={1}>
                <FlexContainer flexDirection="row">
                  <Text center default>
                    Please select a block and then click the settings icon
                    &nbsp;<SettingsWithKnobs size={UNIT * 1.5} />&nbsp;
                    <br />
                    in the top right corner of a block (if applicable).
                  </Text>
                </FlexContainer>
              </Spacing>
            </FlexContainer>
          )
        )}

        {ViewKeyEnum.INTERACTIONS === activeView && isInteractionsEnabled && (
          <PipelineInteractions
            blockInteractionsMapping={blockInteractionsMapping}
            containerWidth={afterWidth}
            createInteraction={(interaction: InteractionType) => createInteraction({
              interaction,
            })}
            interactions={interactions}
            interactionsMapping={interactionsMapping}
            isLoadingCreateInteraction={isLoadingCreateInteraction}
            isLoadingUpdatePipelineInteraction={isLoadingUpdatePipelineInteraction}
            permissions={permissions}
            pipeline={pipeline}
            pipelineInteraction={pipelineInteraction}
            refAfterFooter={refAfterFooter}
            savePipelineInteraction={savePipelineInteraction}
            selectedBlock={selectedBlock}
            setBlockInteractionsMapping={setBlockInteractionsMapping}
            setInteractionsMapping={setInteractionsMapping}
            setPermissions={setPermissions}
            setSelectedBlock={setSelectedBlock}
            updatePipelineInteraction={(
              pipelineInteraction: PipelineInteractionType,
            ) => updatePipelineInteraction({
              pipeline_interaction: pipelineInteraction,
            })}
          />
        )}
      </SidekickContainerStyle>
    </>
  );
}

export default Sidekick;
