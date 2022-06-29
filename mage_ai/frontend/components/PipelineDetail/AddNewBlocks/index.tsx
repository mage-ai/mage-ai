import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import { Add } from '@oracle/icons';
import {
  ICON_SIZE,
  IconContainerStyle,
} from './index.style';

function AddNewBlocks() {
  return (
    <FlexContainer>
      <KeyboardShortcutButton
        beforeElement={
          <IconContainerStyle purple>
            <Add size={ICON_SIZE} />
          </IconContainerStyle>
        }
        inline
        onClick={() => false}
        uuid="AddNewBlocks/Transformer"
      >
        Transformer
      </KeyboardShortcutButton>

      <Spacing ml={1} />

      <KeyboardShortcutButton
        beforeElement={
          <IconContainerStyle blue>
            <Add size={ICON_SIZE} />
          </IconContainerStyle>
        }
        inline
        onClick={() => false}
        uuid="AddNewBlocks/Data_loader"
      >
        Data loader
      </KeyboardShortcutButton>

      <Spacing ml={1} />

      <KeyboardShortcutButton
        beforeElement={
          <IconContainerStyle border>
            <Add size={ICON_SIZE} />
          </IconContainerStyle>
        }
        inline
        onClick={() => false}
        uuid="AddNewBlocks/Scratchpad"
      >
        Scratchpad
      </KeyboardShortcutButton>
    </FlexContainer>
  );
}

export default AddNewBlocks;
