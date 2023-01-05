import { useCallback, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import DBTLogo from '@oracle/icons/custom/DBTLogo';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import Tooltip from '@oracle/components/Tooltip';
import { Add, Sensor as SensorIcon } from '@oracle/icons';
import { AxisEnum } from '@interfaces/ActionPayloadType';
import {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
} from '@interfaces/BlockType';
import {
  COLUMN_ACTION_GROUPINGS,
  ROW_ACTION_GROUPINGS,
} from '@interfaces/TransformerActionType';
import { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import {
  ICON_SIZE,
  IconContainerStyle,
} from './index.style';
import {
  createActionMenuGroupings,
  getdataSourceMenuItems,
  getNonPythonMenuItems,
} from './utils';

type AddNewBlocksProps = {
  addNewBlock: (block: BlockRequestPayloadType) => void;
  blockIdx?: number;
  compact?: boolean;
  hideDataExporter?: boolean;
  hideDataLoader?: boolean;
  hideDbt?: boolean;
  hideRecommendations?: boolean;
  hideScratchpad?: boolean;
  hideSensor?: boolean;
  hideTransformer?: boolean;
  hideTransformerDataSources?: boolean;
  onClickAddSingleDBTModel?: (blockIdx: number) => void;
  pipeline: PipelineType;
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  setCreatingNewDBTModel?: (creatingNewDBTModel: boolean) => void;
  setRecsWindowOpenBlockIdx?: (idx: number) => void;
};

const DATA_LOADER_BUTTON_INDEX = 0;
const TRANSFORMER_BUTTON_INDEX = 1;
const DATA_EXPORTER_BUTTON_INDEX = 2;
const DBT_BUTTON_INDEX = 3;

function AddNewBlocks({
  addNewBlock,
  blockIdx,
  compact,
  hideDataExporter,
  hideDataLoader,
  hideDbt,
  hideRecommendations,
  hideScratchpad,
  hideSensor,
  hideTransformer,
  hideTransformerDataSources,
  onClickAddSingleDBTModel,
  pipeline,
  setAddNewBlockMenuOpenIdx,
  setCreatingNewDBTModel,
  setRecsWindowOpenBlockIdx,
}: AddNewBlocksProps) {
  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState(null);
  const dataLoaderButtonRef = useRef(null);
  const transformerButtonRef = useRef(null);
  const dataExporterButtonRef = useRef(null);
  const dbtButtonRef = useRef(null);
  const sharedProps = {
    compact,
    inline: true,
  };
  const pipelineType = pipeline?.type;
  const isStreamingPipeline = pipelineType === PipelineTypeEnum.STREAMING;
  const iconSize = compact ? ICON_SIZE / 2 : ICON_SIZE;

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
  const handleBlockZIndex = useCallback(() =>
    setAddNewBlockMenuOpenIdx?.(idx => idx === null ? blockIdx : null),
    [blockIdx, setAddNewBlockMenuOpenIdx],
  );

  const isPySpark = PipelineTypeEnum.PYSPARK === pipelineType;

  return (
    <FlexContainer inline>
      <ClickOutside
        onClickOutside={closeButtonMenu}
        open
      >
        <FlexContainer>
          {!hideDataExporter && (
            <>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={getdataSourceMenuItems(addNewBlock, BlockTypeEnum.DATA_LOADER, pipelineType)}
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
                    handleBlockZIndex();
                  }}
                  uuid="AddNewBlocks/Data_loader"
                >
                  Data loader
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>

              <Spacing ml={1} />
            </>
          )}

          {!hideTransformer && (
            <>
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
                    handleBlockZIndex();
                  }}
                  uuid="AddNewBlocks/Transformer"
                >
                  Transformer
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>

              <Spacing ml={1} />
            </>
          )}

          {!hideDataExporter && (
            <>
              <FlyoutMenuWrapper
                disableKeyboardShortcuts
                items={getdataSourceMenuItems(addNewBlock, BlockTypeEnum.DATA_EXPORTER, pipelineType)}
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
                    handleBlockZIndex();
                  }}
                  uuid="AddNewBlocks/Data_exporter"
                >
                  Data exporter
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>

              <Spacing ml={1} />
            </>
          )}

          {!hideDbt && (
            <>
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
                    label: () => 'Single model (from file)',
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
                    handleBlockZIndex();
                  }}
                  uuid="AddNewBlocks/DBT"
                >
                  DBT model
                </KeyboardShortcutButton>
              </FlyoutMenuWrapper>

              <Spacing ml={1} />
            </>
          )}
        </FlexContainer>
      </ClickOutside>

      {!hideScratchpad && (
        <>
          <Tooltip
            block
            label="Write experimental code that doesn’t get executed when you run your pipeline."
            size={null}
            widthFitContent
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

          <Spacing ml={1} />
        </>
      )}

      {!isStreamingPipeline &&
        <>
          {!hideSensor && (
            <>
              <Tooltip
                block
                label="Add a sensor so that other blocks only run when sensor is complete."
                size={null}
                widthFitContent
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
                    addNewBlock({
                      language: BlockLanguageEnum.PYTHON,
                      type: BlockTypeEnum.SENSOR,
                    });
                  }}
                  uuid="AddNewBlocks/Sensor"
                >
                  Sensor
                </KeyboardShortcutButton>
              </Tooltip>

              <Spacing ml={1} />
            </>
          )}

          {/*{!hideRecommendations && (
            <KeyboardShortcutButton
              {...sharedProps}
              beforeElement={
                <IconContainerStyle compact={compact}>
                  <Mage8Bit size={ICON_SIZE * (compact ? 0.75 : 1.25)} />
                </IconContainerStyle>
              }
              onClick={(e) => {
                e.preventDefault();
                setRecsWindowOpenBlockIdx(blockIdx);
              }}
              uuid="AddNewBlocks/Recommendations"
            >
              Recs
            </KeyboardShortcutButton>
          )}*/}
        </>
      }
    </FlexContainer>
  );
}

export default AddNewBlocks;
