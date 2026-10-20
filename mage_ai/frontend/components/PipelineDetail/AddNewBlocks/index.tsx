import { useCallback, useMemo, useRef, useState } from 'react';

import AddNewBlocksV2 from './v2';
import BlockTemplateType from '@interfaces/BlockTemplateType';
import ClickOutside from '@oracle/components/ClickOutside';
import DBTLogo from '@oracle/icons/custom/DBTLogo';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Tooltip from '@oracle/components/Tooltip';
import useProject from '@utils/models/project/useProject';
import { Add, HexagonAll, Sensor as SensorIcon } from '@oracle/icons';
import { AxisEnum } from '@interfaces/ActionPayloadType';
import {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import {
  ButtonWrapper,
  ICON_SIZE,
  IconContainerStyle,
} from './index.style';
import {
  COLUMN_ACTION_GROUPINGS,
  ROW_ACTION_GROUPINGS,
} from '@interfaces/TransformerActionType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import { OpenBlockBrowserModalType } from '@components/BlockBrowser/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  createActionMenuGroupings,
  createColorMenuItems,
  getdataSourceMenuItems,
  getNonPythonMenuItems,
  groupBlockTemplates,
} from './utils';

type AddNewBlocksProps = {
  addNewBlock: (block: BlockRequestPayloadType) => void;
  blockIdx?: number;
  blockTemplates?: BlockTemplateType[];
  compact?: boolean;
  focusedAddNewBlockSearch?: boolean;
  hideDataExporter?: boolean;
  hideDataLoader?: boolean;
  hideDbt?: boolean;
  hideCustom?: boolean;
  hideMarkdown?: boolean;
  hideScratchpad?: boolean;
  hideSensor?: boolean;
  hideTransformer?: boolean;
  hideTransformerDataSources?: boolean;
  onClickAddSingleDBTModel?: (blockIdx: number) => void;
  pipeline: PipelineType;
  project?: ProjectType;
  searchTextInputRef?: any;
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  setCreatingNewDBTModel?: (creatingNewDBTModel: boolean) => void;
  setFocusedAddNewBlockSearch?: (focused: boolean) => void;
  showBrowseTemplates?: (opts?: {
    addNew?: boolean;
    blockType?: BlockTypeEnum;
    language?: BlockLanguageEnum;
  }) => void;
  showConfigureProjectModal?: (opts: {
    cancelButtonText?: string;
    header?: any;
    onCancel?: () => void;
    onSaveSuccess?: (project: ProjectType) => void;
  }) => void;
  showGlobalDataProducts?: (opts?: {
    addNewBlock?: (block: BlockRequestPayloadType) => Promise<any>;
  }) => void;
} & OpenBlockBrowserModalType;

const DATA_LOADER_BUTTON_INDEX = 0;
const TRANSFORMER_BUTTON_INDEX = 1;
const DATA_EXPORTER_BUTTON_INDEX = 2;
const DBT_BUTTON_INDEX = 3;
const CUSTOM_BUTTON_INDEX = 4;
const SENSOR_BUTTON_INDEX = 6;
const MARKDOWN_BUTTON_INDEX = 7;

function AddNewBlocks({
  addNewBlock,
  blockIdx,
  blockTemplates,
  compact,
  focusedAddNewBlockSearch,
  hideCustom,
  hideDataExporter,
  hideDataLoader,
  hideDbt,
  hideMarkdown,
  hideScratchpad,
  hideSensor,
  hideTransformer,
  hideTransformerDataSources,
  onClickAddSingleDBTModel,
  pipeline,
  project,
  searchTextInputRef,
  setAddNewBlockMenuOpenIdx,
  setCreatingNewDBTModel,
  setFocusedAddNewBlockSearch,
  showBlockBrowserModal,
  showBrowseTemplates,
  showConfigureProjectModal,
  showGlobalDataProducts,
}: AddNewBlocksProps) {
  const {
    featureEnabled,
    featureUUIDs,
  } = useProject();

  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState(null);
  const dataLoaderButtonRef = useRef(null);
  const transformerButtonRef = useRef(null);
  const dataExporterButtonRef = useRef(null);
  const dbtButtonRef = useRef(null);
  const customBlockButtonRef = useRef(null);
  const sensorButtonRef = useRef(null);
  const markdownButtonRef = useRef(null);
  const sharedProps = {
    compact,
    inline: true,
  };
  const pipelineType = pipeline?.type;
  const isStreamingPipeline = pipelineType === PipelineTypeEnum.STREAMING;
  const iconSize = compact ? ICON_SIZE / 2 : ICON_SIZE;
  const MAX_TOOLTIP_WIDTH = UNIT * 25;

  const columnActionMenuItems = useMemo(() => createActionMenuGroupings(
    COLUMN_ACTION_GROUPINGS,
    AxisEnum.COLUMN,
    addNewBlock,
  ), [
    addNewBlock,
  ]);
  const rowActionMenuItems = useMemo(() => createActionMenuGroupings(
    ROW_ACTION_GROUPINGS,
    AxisEnum.ROW,
    addNewBlock,
  ), [
    addNewBlock,
  ]);

  const allActionMenuItems = useMemo(() => {
    const arr: FlyoutMenuItemType[] = [
      {
        label: () => 'Generic (no template)',
        onClick: () => {
          addNewBlock({
            language: BlockLanguageEnum.PYTHON,
            type: BlockTypeEnum.TRANSFORMER,
          });
        },
        uuid: 'generic_transformer_action',
      },
      {
        bold: true,
        items: rowActionMenuItems,
        label: () => 'Row actions',
        uuid: 'row_actions_grouping',
      },
      {
        isGroupingTitle: true,
        label: () => 'Column actions',
        uuid: 'column_actions_grouping',
      },
      ...columnActionMenuItems,
    ];

    if (!hideTransformerDataSources) {
      arr.splice(
        1,
        0,
        {
          bold: true,
          items: getdataSourceMenuItems(addNewBlock, BlockTypeEnum.TRANSFORMER, pipelineType),
          label: () => 'Data sources',
          uuid: 'data_sources_grouping',
        },
      );
    }

    return arr;
  }, [
    addNewBlock,
    columnActionMenuItems,
    hideTransformerDataSources,
    pipelineType,
    rowActionMenuItems,
  ]);

  const closeButtonMenu = useCallback(() => setButtonMenuOpenIndex(null), []);
  const handleBlockZIndex = useCallback((newButtonMenuOpenIndex: number) =>
    setAddNewBlockMenuOpenIdx?.(idx => (
      (idx === null || buttonMenuOpenIndex !== newButtonMenuOpenIndex)
        ? blockIdx
        : null
    )),
    [blockIdx, buttonMenuOpenIndex, setAddNewBlockMenuOpenIdx],
  );

  const isPySpark = PipelineTypeEnum.PYSPARK === pipelineType;

  const blockTemplatesByBlockType = useMemo(() => groupBlockTemplates(
    blockTemplates,
    addNewBlock,
    {
      'data_integrations/destinations/base': true,
      'data_integrations/sources/base': true,
    },
  ), [
    addNewBlock,
    blockTemplates,
  ]);

  const dataLoaderItems = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_LOADER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      showBrowseTemplates,
    },
  ), [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
    showBrowseTemplates,
  ]);

  const dataExporterItems = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_EXPORTER,
    pipelineType,
    {
      blockTemplatesByBlockType,
      showBrowseTemplates,
    },
  ), [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
    showBrowseTemplates,
  ]);

  const transformerItems = useMemo(() => {
    if (isPySpark || PipelineTypeEnum.INTEGRATION === pipelineType) {
      return allActionMenuItems;
    }

    if (isStreamingPipeline) {
      return [
        {
          items: getdataSourceMenuItems(addNewBlock, BlockTypeEnum.TRANSFORMER, pipelineType),
          label: () => 'Python',
          uuid: 'transformers/python',
        },
        ...getdataSourceMenuItems(
          addNewBlock,
          BlockTypeEnum.TRANSFORMER,
          pipelineType,
          {
            blockTemplatesByBlockType,
            onlyCustomTemplate: true,
            showBrowseTemplates,
          },
        ),
      ];
    }

    return [
      {
        items: allActionMenuItems,
        label: () => 'Python',
        uuid: 'transformers/python_all',
      },
      ...getNonPythonMenuItems(addNewBlock, BlockTypeEnum.TRANSFORMER),
      ...getdataSourceMenuItems(
        addNewBlock,
        BlockTypeEnum.TRANSFORMER,
        pipelineType,
        {
          blockTemplatesByBlockType,
          onlyCustomTemplate: true,
          showBrowseTemplates,
        },
      ),
    ];
  }, [
    addNewBlock,
    allActionMenuItems,
    blockTemplatesByBlockType,
    isPySpark,
    isStreamingPipeline,
    pipelineType,
    showBrowseTemplates,
  ]);

  const itemsDBT = useMemo(() => [
    {
      label: () => 'Single model or snapshot (from file)',
      onClick: () => {
        onClickAddSingleDBTModel?.(blockIdx);
      },
      uuid: 'dbt/single_model',
    },
    {
      label: () => 'All models (w/ optional exclusion)',
      onClick: () => addNewBlock({
        configuration: {
          dbt: {
            command: 'run',
          },
        },
        language: BlockLanguageEnum.YAML,
        type: BlockTypeEnum.DBT,
      }),
      uuid: 'dbt/all_models',
    },
    {
      label: () => 'Generic dbt command',
      onClick: () => addNewBlock({
        configuration: {
          dbt: {
            command: 'run',
          },
        },
        language: BlockLanguageEnum.YAML,
        type: BlockTypeEnum.DBT,
      }),
      uuid: 'dbt/generic_command',
    },
    {
      isGroupingTitle: true,
      label: () => 'Create new models',
      uuid: 'dbt/new_model/group',
    },
    {
      disabled: true,
      label: () => 'Use the file browser to create new SQL files',
      uuid: 'dbt/new_model',
    },
  ], [
    addNewBlock,
    blockIdx,
    featureEnabled,
    featureUUIDs,
    onClickAddSingleDBTModel,
    setCreatingNewDBTModel,
    showBlockBrowserModal,
  ]);

  const useV2 = useMemo(
    () => PipelineTypeEnum.PYTHON === pipelineType && !isPySpark
      && project?.features?.[FeatureUUIDEnum.ADD_NEW_BLOCK_V2],
    [
      isPySpark,
      pipelineType,
      project,
    ],
  );

  if (useV2) {
    return (
      // @ts-ignore
      <AddNewBlocksV2
        addNewBlock={addNewBlock}
        blockIdx={blockIdx}
        blockTemplatesByBlockType={blockTemplatesByBlockType}
        compact={compact}
        focused={focusedAddNewBlockSearch}
        itemsDBT={itemsDBT}
        pipelineType={pipelineType}
        project={project}
        searchTextInputRef={searchTextInputRef}
        setAddNewBlockMenuOpenIdx={setAddNewBlockMenuOpenIdx}
        setFocused={setFocusedAddNewBlockSearch}
        showBrowseTemplates={showBrowseTemplates}
        showConfigureProjectModal={showConfigureProjectModal}
        showGlobalDataProducts={showGlobalDataProducts}
      />
    );
  }

  return (
    <FlexContainer flexWrap="wrap" inline>
      <ClickOutside
        onClickOutside={closeButtonMenu}
        open
      >
        <FlexContainer flexWrap="wrap">
          {!hideDataExporter && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === DATA_LOADER_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={dataLoaderItems}
                onClickCallback={closeButtonMenu}
                open={buttonMenuOpenIndex === DATA_LOADER_BUTTON_INDEX}
                parentRef={dataLoaderButtonRef}
                uuid="data_loader_button"
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <IconContainerStyle blue compact={compact}>
                      <Add size={iconSize} />
                    </IconContainerStyle>
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === DATA_LOADER_BUTTON_INDEX
                        ? null
                        : DATA_LOADER_BUTTON_INDEX,
                    );
                    handleBlockZIndex(DATA_LOADER_BUTTON_INDEX);
                  }}
                  uuid="AddNewBlocks/Data_loader"
                >
                  Data loader
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>
            </ButtonWrapper>
          )}

          {!hideTransformer && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === TRANSFORMER_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={transformerItems}
                onClickCallback={closeButtonMenu}
                open={buttonMenuOpenIndex === TRANSFORMER_BUTTON_INDEX}
                parentRef={transformerButtonRef}
                uuid="transformer_button"
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <IconContainerStyle compact={compact} purple>
                      <Add size={iconSize} />
                    </IconContainerStyle>
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === TRANSFORMER_BUTTON_INDEX
                        ? null
                        : TRANSFORMER_BUTTON_INDEX,
                    );
                    handleBlockZIndex(TRANSFORMER_BUTTON_INDEX);
                  }}
                  uuid="AddNewBlocks/Transformer"
                >
                  Transformer
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>
            </ButtonWrapper>
          )}

          {!hideDataExporter && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === DATA_EXPORTER_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={dataExporterItems}
                onClickCallback={closeButtonMenu}
                open={buttonMenuOpenIndex === DATA_EXPORTER_BUTTON_INDEX}
                parentRef={dataExporterButtonRef}
                uuid="data_exporter_button"
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <IconContainerStyle compact={compact} yellow>
                      <Add
                        inverted
                        size={iconSize}
                      />
                    </IconContainerStyle>
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === DATA_EXPORTER_BUTTON_INDEX
                        ? null
                        : DATA_EXPORTER_BUTTON_INDEX,
                    );
                    handleBlockZIndex(DATA_EXPORTER_BUTTON_INDEX);
                  }}
                  uuid="AddNewBlocks/Data_exporter"
                >
                  Data exporter
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>
            </ButtonWrapper>
          )}

          {!hideDbt && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === DBT_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={[
                  ...itemsDBT,
                  ...getdataSourceMenuItems(
                    addNewBlock,
                    BlockTypeEnum.DBT,
                    pipelineType,
                    {
                      blockTemplatesByBlockType,
                      onlyCustomTemplate: true,
                      showBrowseTemplates,
                    },
                  ),
                ]}
                onClickCallback={closeButtonMenu}
                open={buttonMenuOpenIndex === DBT_BUTTON_INDEX}
                parentRef={dbtButtonRef}
                uuid="dbt_button"
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <DBTLogo size={ICON_SIZE * (compact ? 0.75 : 1.25)} />
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === DBT_BUTTON_INDEX
                        ? null
                        : DBT_BUTTON_INDEX,
                    );
                    handleBlockZIndex(DBT_BUTTON_INDEX);
                  }}
                  uuid="AddNewBlocks/DBT"
                >
                  DBT model
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>
            </ButtonWrapper>
          )}

          {!hideCustom && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === CUSTOM_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={[
                  {
                    items: createColorMenuItems(
                      addNewBlock,
                      BlockTypeEnum.CUSTOM,
                      BlockLanguageEnum.PYTHON,
                    ),
                    label: () => 'Python',
                    uuid: 'custom_block_python',
                  },
                  {
                    items: createColorMenuItems(
                      addNewBlock,
                      BlockTypeEnum.CUSTOM,
                      BlockLanguageEnum.SQL,
                    ),
                    label: () => 'SQL',
                    uuid: 'custom_block_sql',
                  },
                  ...getdataSourceMenuItems(
                    addNewBlock,
                    BlockTypeEnum.CUSTOM,
                    pipelineType,
                    {
                      blockTemplatesByBlockType,
                      onlyCustomTemplate: true,
                      showBrowseTemplates,
                    },
                  ),
                ]}
                onClickCallback={closeButtonMenu}
                open={buttonMenuOpenIndex ===CUSTOM_BUTTON_INDEX}
                parentRef={customBlockButtonRef}
                uuid="custom_block_button"
              >
                <Tooltip
                  block
                  label="Add a custom code block with a designated color."
                  maxWidth={MAX_TOOLTIP_WIDTH}
                  size={null}
                >
                  <KeyboardShortcutButton
                    {...sharedProps}
                    beforeElement={
                      <IconContainerStyle compact={compact} grey>
                        <Add
                          inverted
                          size={iconSize}
                        />
                      </IconContainerStyle>
                    }
                    onClick={(e) => {
                      e.preventDefault();
                      setButtonMenuOpenIndex(val =>
                        val === CUSTOM_BUTTON_INDEX
                          ? null
                          : CUSTOM_BUTTON_INDEX,
                      );
                      handleBlockZIndex(CUSTOM_BUTTON_INDEX);
                    }}
                    uuid="AddNewBlocks/Scratchpad"
                  >
                    Custom
                  </KeyboardShortcutButton>
                </Tooltip>
              </FlyoutMenuWrapper>
            </ButtonWrapper>
          )}

          {!hideScratchpad && (
            <ButtonWrapper>
              <Tooltip
                block
                label="Write experimental code that doesn’t get executed when you run your pipeline."
                maxWidth={MAX_TOOLTIP_WIDTH}
                size={null}
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <IconContainerStyle border compact={compact}>
                      <Add size={iconSize} />
                    </IconContainerStyle>
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    addNewBlock({
                      type: BlockTypeEnum.SCRATCHPAD,
                    });
                  }}
                  uuid="AddNewBlocks/Scratchpad"
                >
                  Scratchpad
                </KeyboardShortcutButton>
              </Tooltip>
            </ButtonWrapper>
          )}

          {!hideScratchpad && (
            <ButtonWrapper>
              <Tooltip
                block
                label="Add a global data product block"
                maxWidth={MAX_TOOLTIP_WIDTH}
                size={null}
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <IconContainerStyle compact={compact}>
                      <HexagonAll size={iconSize} />
                    </IconContainerStyle>
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    showGlobalDataProducts({
                      // @ts-ignore
                      addNewBlock,
                    });
                  }}
                  uuid="AddNewBlocks/GlobalDataProducts"
                >
                  Global data product
                </KeyboardShortcutButton>
              </Tooltip>
            </ButtonWrapper>
          )}

          {!isStreamingPipeline && !hideSensor && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === SENSOR_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={[
                  ...getdataSourceMenuItems(addNewBlock, BlockTypeEnum.SENSOR, pipelineType),
                  ...getdataSourceMenuItems(
                    addNewBlock,
                    BlockTypeEnum.SENSOR,
                    pipelineType,
                    {
                      blockTemplatesByBlockType,
                      onlyCustomTemplate: true,
                      showBrowseTemplates,
                    },
                  ),
                ]}
                onClickCallback={closeButtonMenu}
                open={buttonMenuOpenIndex === SENSOR_BUTTON_INDEX}
                parentRef={sensorButtonRef}
                uuid="sensor_button"
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <IconContainerStyle compact={compact}>
                      <SensorIcon pink size={ICON_SIZE * (compact ? 0.75 : 1.25)} />
                    </IconContainerStyle>
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === SENSOR_BUTTON_INDEX
                        ? null
                        : SENSOR_BUTTON_INDEX,
                    );
                    handleBlockZIndex(SENSOR_BUTTON_INDEX);
                  }}
                  uuid="AddNewBlocks/Sensor"
                >
                  Sensor
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>
            </ButtonWrapper>
          )}

          {!hideMarkdown && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === MARKDOWN_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={[
                  {
                    label: () => 'Generic (no template)',
                    onClick: () => {
                      addNewBlock({
                        language: BlockLanguageEnum.MARKDOWN,
                        type: BlockTypeEnum.MARKDOWN,
                      });
                    },
                    uuid: 'generic_markdown',
                  },
                  ...getdataSourceMenuItems(
                    addNewBlock,
                    BlockTypeEnum.MARKDOWN,
                    pipelineType,
                    {
                      blockTemplatesByBlockType,
                      onlyCustomTemplate: true,
                      showBrowseTemplates,
                    },
                  ),
                ]}
                onClickCallback={closeButtonMenu}
                open={buttonMenuOpenIndex === MARKDOWN_BUTTON_INDEX}
                parentRef={markdownButtonRef}
                uuid="markdown_button"
              >
                <KeyboardShortcutButton
                  {...sharedProps}
                  beforeElement={
                    <IconContainerStyle compact={compact} sky>
                      <Add
                        inverted
                        size={iconSize}
                      />
                    </IconContainerStyle>
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    setButtonMenuOpenIndex(val =>
                      val === MARKDOWN_BUTTON_INDEX
                        ? null
                        : MARKDOWN_BUTTON_INDEX,
                    );
                    handleBlockZIndex(MARKDOWN_BUTTON_INDEX);
                  }}
                  uuid="AddNewBlocks/Markdown"
                >
                  Markdown
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>
            </ButtonWrapper>
          )}
        </FlexContainer>
      </ClickOutside>
    </FlexContainer>
  );
}

export default AddNewBlocks;
