import { useCallback, useRef, useState } from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import { Add } from '@oracle/icons';
import { AxisEnum } from '@interfaces/ActionPayloadType';
import { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import {
  COLUMN_ACTION_GROUPINGS,
  ROW_ACTION_GROUPINGS,
} from '@interfaces/TransformerActionType';
import {
  DATA_SOURCE_TYPES,
  DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING,
  DataSourceTypeEnum,
} from '@interfaces/DataSourceType';
import {
  ICON_SIZE,
  IconContainerStyle,
} from './index.style';
import { createActionMenuGroupings } from './utils';

type AddNewBlocksProps = {
  addNewBlock: (block: BlockRequestPayloadType) => void;
  compact?: boolean;
};

const DATA_LOADER_BUTTON_INDEX = 0;
const TRANSFORMER_BUTTON_INDEX = 1;

function AddNewBlocks({
  addNewBlock,
  compact,
}: AddNewBlocksProps) {
  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState(null);
  const dataLoaderButtonRef = useRef(null);
  const transformerButtonRef = useRef(null);
  const sharedProps = {
    compact,
    inline: true,
  };

  const dataLoaderMenuItems = DATA_SOURCE_TYPES.map((sourceType: DataSourceTypeEnum) => ({
    label: () => DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING[sourceType],
    onClick: () => {
      addNewBlock({
        config: {
          data_source: sourceType === DataSourceTypeEnum.GENERIC ? null : sourceType,
        },
        type: BlockTypeEnum.DATA_LOADER,
      });
    },
    uuid: sourceType,
  }));

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
          type: BlockTypeEnum.TRANSFORMER,
        });
      },
      uuid: 'generic_transformer_action',
    },
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

  return (
    <FlexContainer inline>
      <ClickOutside
        onClickOutside={closeButtonMenu}
        open
      >
        <FlexContainer>
          <FlyoutMenuWrapper
            items={dataLoaderMenuItems}
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
              }}
              uuid="AddNewBlocks/Data_loader"
            >
              Data loader
            </KeyboardShortcutButton>
          </FlyoutMenuWrapper>

          <Spacing ml={1} />

          <FlyoutMenuWrapper
            items={allActionMenuItems}
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
              }}
              uuid="AddNewBlocks/Transformer"
            >
              Transformer
            </KeyboardShortcutButton>
          </FlyoutMenuWrapper>
        </FlexContainer>
      </ClickOutside>

      <Spacing ml={1} />

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
          addNewBlock({
            type: BlockTypeEnum.DATA_EXPORTER,
          });
        }}
        uuid="AddNewBlocks/Data_exporter"
      >
        Data exporter
      </KeyboardShortcutButton>

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
    </FlexContainer>
  );
}

export default AddNewBlocks;
