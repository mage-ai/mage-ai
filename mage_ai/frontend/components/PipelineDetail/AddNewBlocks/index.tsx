import { useCallback, useMemo, useRef, useState } from 'react';

import BlockTemplateType from '@interfaces/BlockTemplateType';
import ClickOutside from '@oracle/components/ClickOutside';
import DBTLogo from '@oracle/icons/custom/DBTLogo';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Tooltip from '@oracle/components/Tooltip';
import { Add, Edit, Sensor as SensorIcon } from '@oracle/icons';
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
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  setCreatingNewDBTModel?: (creatingNewDBTModel: boolean) => void;
};

const DATA_LOADER_BUTTON_INDEX = 0;
const TRANSFORMER_BUTTON_INDEX = 1;
const DATA_EXPORTER_BUTTON_INDEX = 2;
const DBT_BUTTON_INDEX = 3;
const CUSTOM_BUTTON_INDEX = 4;
const SENSOR_BUTTON_INDEX = 6;

function AddNewBlocks({
  addNewBlock,
  blockIdx,
  blockTemplates,
  compact,
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
  setAddNewBlockMenuOpenIdx,
  setCreatingNewDBTModel,
}: AddNewBlocksProps) {
  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState(null);
  const dataLoaderButtonRef = useRef(null);
  const transformerButtonRef = useRef(null);
  const dataExporterButtonRef = useRef(null);
  const dbtButtonRef = useRef(null);
  const customBlockButtonRef = useRef(null);
  const sensorButtonRef = useRef(null);
  const sharedProps = {
    compact,
    inline: true,
  };
  const pipelineType = pipeline?.type;
  const isStreamingPipeline = pipelineType === PipelineTypeEnum.STREAMING;
  const iconSize = compact ? ICON_SIZE / 2 : ICON_SIZE;
  const MAX_TOOLTIP_WIDTH = UNIT * 25;

  const columnActionMenuItems = createActionMenuGroupings(
    COLUMN_ACTION_GROUPINGS,
    AxisEnum.COLUMN,
    addNewBlock,
  );
  const rowActionMenuItems = createActionMenuGroupings(
    ROW_ACTION_GROUPINGS,
    AxisEnum.ROW,
    addNewBlock,
  );

  const allActionMenuItems: FlyoutMenuItemType[] = [
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
    allActionMenuItems.splice(
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
    },
  ), [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

  const dataExporterItems = useMemo(() => getdataSourceMenuItems(
    addNewBlock,
    BlockTypeEnum.DATA_EXPORTER,
    pipelineType,
    {
      blockTemplatesByBlockType,
    },
  ), [
    addNewBlock,
    blockTemplatesByBlockType,
    pipelineType,
  ]);

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
                items={isPySpark || PipelineTypeEnum.INTEGRATION === pipelineType
                  ? allActionMenuItems
                  : (isStreamingPipeline
                    ?
                      [
                        {
                          items: getdataSourceMenuItems(addNewBlock, BlockTypeEnum.TRANSFORMER, pipelineType),
                          label: () => 'Python',
                          uuid: 'transformers/python',
                        },
                      ]
                    :
                      [
                        {
                          items: allActionMenuItems,
                          label: () => 'Python',
                          uuid: 'transformers/python_all',
                        },
                        ...getNonPythonMenuItems(addNewBlock, BlockTypeEnum.TRANSFORMER),
                      ]
                  )
                }
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
                  {
                    label: () => 'New model',
                    onClick: () => {
                      setCreatingNewDBTModel?.(true);
                      onClickAddSingleDBTModel?.(blockIdx);
                    },
                    uuid: 'dbt/new_model',
                  },
                  {
                    label: () => 'Single model or snapshot (from file)',
                    onClick: () => onClickAddSingleDBTModel?.(blockIdx),
                    uuid: 'dbt/single_model',
                  },
                  {
                    label: () => 'All models (w/ optional exclusion)',
                    onClick: () => addNewBlock({
                      language: BlockLanguageEnum.YAML,
                      type: BlockTypeEnum.DBT,
                    }),
                    uuid: 'dbt/all_models',
                  },
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

          {!isStreamingPipeline && !hideSensor && (
            <ButtonWrapper increasedZIndex={buttonMenuOpenIndex === SENSOR_BUTTON_INDEX}>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={getdataSourceMenuItems(addNewBlock, BlockTypeEnum.SENSOR, pipelineType)}
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
            <ButtonWrapper>
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
                  addNewBlock({
                    language: BlockLanguageEnum.MARKDOWN,
                    type: BlockTypeEnum.MARKDOWN,
                  });
                }}
                uuid="AddNewBlocks/Markdown"
              >
                Markdown
              </KeyboardShortcutButton>
            </ButtonWrapper>
          )}
        </FlexContainer>
      </ClickOutside>
    </FlexContainer>
  );
}

export default AddNewBlocks;
