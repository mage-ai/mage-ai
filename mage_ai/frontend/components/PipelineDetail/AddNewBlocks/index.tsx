import { useCallback, useMemo, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Mage8Bit from '@oracle/icons/custom/Mage8Bit';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import { Add } from '@oracle/icons';
import { AxisEnum } from '@interfaces/ActionPayloadType';
import {
  BlockLanguageEnum,
  BlockRequestPayloadType,
  BlockTypeEnum,
  CONVERTIBLE_BLOCK_TYPES,
} from '@interfaces/BlockType';
import {
  COLUMN_ACTION_GROUPINGS,
  ROW_ACTION_GROUPINGS,
} from '@interfaces/TransformerActionType';
import {
  ICON_SIZE,
  IconContainerStyle,
} from './index.style';
import { createActionMenuGroupings, createDataSourceMenuItems } from './utils';

type AddNewBlocksProps = {
  addNewBlock: (block: BlockRequestPayloadType) => void;
  blockIdx?: number;
  compact?: boolean;
  pipeline: PipelineType;
  setAddNewBlockMenuOpenIdx?: (cb: any) => void;
  setRecsWindowOpenBlockIdx: (idx: number) => void;
};

const DATA_LOADER_BUTTON_INDEX = 0;
const TRANSFORMER_BUTTON_INDEX = 1;
const DATA_EXPORTER_BUTTON_INDEX = 2;

function AddNewBlocks({
  addNewBlock,
  compact,
  blockIdx,
  pipeline,
  setAddNewBlockMenuOpenIdx,
  setRecsWindowOpenBlockIdx,
}: AddNewBlocksProps) {
  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState(null);
  const dataLoaderButtonRef = useRef(null);
  const transformerButtonRef = useRef(null);
  const dataExporterButtonRef = useRef(null);
  const sharedProps = {
    compact,
    inline: true,
  };

  const dataSourceMenuItems = useMemo(() => (
    Object.fromEntries(CONVERTIBLE_BLOCK_TYPES.map(
      (blockType: BlockTypeEnum) => ([
        blockType,
        createDataSourceMenuItems(blockType, addNewBlock),
      ]),
    ),
  )), [
    addNewBlock,
  ]);

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

  const allActionMenuItems = [
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
      isGroupingTitle: true,
      label: () => 'Data sources',
      uuid: 'data_sources_grouping',
    },
    ...dataSourceMenuItems[BlockTypeEnum.TRANSFORMER],
    {
      isGroupingTitle: true,
      label: () => 'Column actions',
      uuid: 'column_actions_grouping',
    },
    ...columnActionMenuItems,
    {
      isGroupingTitle: true,
      label: () => 'Row actions',
      uuid: 'row_actions_grouping',
    },
    ...rowActionMenuItems,
  ];

  const closeButtonMenu = useCallback(() => setButtonMenuOpenIndex(null), []);
  const handleBlockZIndex = useCallback(() =>
    setAddNewBlockMenuOpenIdx?.(idx => idx === null ? blockIdx : null),
    [blockIdx, setAddNewBlockMenuOpenIdx],
  );

  const isPySpark = PipelineTypeEnum.PYSPARK === pipeline?.type;

  return (
    <FlexContainer inline>
      <ClickOutside
        onClickOutside={closeButtonMenu}
        open
      >
        <FlexContainer>
          <FlyoutMenuWrapper
            items={isPySpark
              ? dataSourceMenuItems[BlockTypeEnum.DATA_LOADER]
              : [
                  {
                    label: () => 'SQL',
                    onClick: () => addNewBlock({
                      language: BlockLanguageEnum.SQL,
                      type: BlockTypeEnum.DATA_LOADER,
                    }),
                    uuid: 'data_loaders/sql',
                  },
                  {
                    label: () => 'Python',
                    items: dataSourceMenuItems[BlockTypeEnum.DATA_LOADER],
                    uuid: 'data_loaders/python',
                  },
                ]
            }
            onClickCallback={closeButtonMenu}
            open={buttonMenuOpenIndex === DATA_LOADER_BUTTON_INDEX}
            parentRef={dataLoaderButtonRef}
            uuid="data_loader_button"
          >
            <KeyboardShortcutButton
              {...sharedProps}
              beforeElement={
                <IconContainerStyle blue compact={compact}>
                  <Add size={compact ? ICON_SIZE / 2 : ICON_SIZE} />
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

          <FlyoutMenuWrapper
            items={isPySpark
              ? allActionMenuItems
              : [
                {
                  label: () => 'SQL',
                  onClick: () => addNewBlock({
                    language: BlockLanguageEnum.SQL,
                    type: BlockTypeEnum.TRANSFORMER,
                  }),
                  uuid: 'transformers/sql',
                },
                {
                  label: () => 'Python',
                  items: allActionMenuItems,
                  uuid: 'transformers/python',
                },
              ]
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
                  <Add size={compact ? ICON_SIZE / 2 : ICON_SIZE} />
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

          <FlyoutMenuWrapper
            items={isPySpark
              ? dataSourceMenuItems[BlockTypeEnum.DATA_EXPORTER]
              : [
                {
                  label: () => 'SQL',
                  onClick: () => addNewBlock({
                    language: BlockLanguageEnum.SQL,
                    type: BlockTypeEnum.DATA_EXPORTER,
                  }),
                  uuid: 'data_exporters/sql',
                },
                {
                  label: () => 'Python',
                  items: dataSourceMenuItems[BlockTypeEnum.DATA_EXPORTER],
                  uuid: 'data_exporters/python',
                },
              ]
            }
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
                    size={compact ? ICON_SIZE / 2 : ICON_SIZE}
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
        </FlexContainer>
      </ClickOutside>

      <Spacing ml={1} />

      <KeyboardShortcutButton
        {...sharedProps}
        beforeElement={
          <IconContainerStyle border compact={compact}>
            <Add size={compact ? ICON_SIZE / 2 : ICON_SIZE} />
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

      <Spacing ml={1} />

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
    </FlexContainer>
  );
}

export default AddNewBlocks;
