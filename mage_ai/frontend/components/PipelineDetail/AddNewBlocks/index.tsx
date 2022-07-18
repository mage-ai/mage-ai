import { useRef, useState } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenuWrapper from '@oracle/components/FlyoutMenu/FlyoutMenuWrapper';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import { Add } from '@oracle/icons';
import { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import {
  DATA_SOURCE_TYPES,
  DATA_SOURCE_TYPE_HUMAN_READABLE_NAME_MAPPING,
  DataSourceTypeEnum,
} from '@interfaces/DataSourceType';
import {
  ICON_SIZE,
  IconContainerStyle,
} from './index.style';

type AddNewBlocksProps = {
  addNewBlock: (block: BlockRequestPayloadType) => void;
  compact?: boolean;
};

const TRANSFORMER_BUTTON_INDEX = 0;
const DATA_LOADER_BUTTON_INDEX = 1;

function AddNewBlocks({
  addNewBlock,
  compact,
}: AddNewBlocksProps) {
  const [buttonMenuOpenIndex, setButtonMenuOpenIndex] = useState(null);
  const dataLoaderButtonRef = useRef(null);
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

  return (
    <FlexContainer inline>
      <KeyboardShortcutButton
        {...sharedProps}
        beforeElement={
          <IconContainerStyle compact={compact} purple >
            <Add size={compact ? ICON_SIZE / 2 : ICON_SIZE} />
          </IconContainerStyle>
        }
        onClick={(e) => {
          e.preventDefault();
          addNewBlock({
            type: BlockTypeEnum.TRANSFORMER,
          });
        }}
        uuid="AddNewBlocks/Transformer"
      >
        Transformer
      </KeyboardShortcutButton>

      <Spacing ml={1} />

      <FlyoutMenuWrapper
        items={dataLoaderMenuItems}
        onClickOutside={() => setButtonMenuOpenIndex(null)}
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
