import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import { Add } from '@oracle/icons';
import {
  ICON_SIZE,
  IconContainerStyle,
} from './index.style';

type AddNewBlocksProps = {
  addNewBlock: (block: BlockType) => void;
  compact?: boolean;
};

function AddNewBlocks({
  addNewBlock,
  compact,
}: AddNewBlocksProps) {
  const sharedProps = {
    compact,
    inline: true,
  };

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

      <KeyboardShortcutButton
        {...sharedProps}
        beforeElement={
          <IconContainerStyle blue compact={compact}>
            <Add size={compact ? ICON_SIZE / 2 : ICON_SIZE} />
          </IconContainerStyle>
        }
        onClick={(e) => {
          e.preventDefault();
          addNewBlock({
            type: BlockTypeEnum.DATA_LOADER,
          });
        }}
        uuid="AddNewBlocks/Data_loader"
      >
        Data loader
      </KeyboardShortcutButton>

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
