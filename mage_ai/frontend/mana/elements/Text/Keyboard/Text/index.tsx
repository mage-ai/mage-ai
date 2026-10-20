import Text from '../../../Text';
import { DivStyled, KbdStyled } from './index.style';
import { KEY_CODE_KEY_SYMBOL_MAPPING } from '@utils/hooks/keyboardShortcuts/constants';
import { KeyboardTextType } from '../types';

type KeyboardTextProps = {
  inline?: boolean;
  monospace?: boolean;
  text: KeyboardTextType;
  small?: boolean;
  xsmall?: boolean;
};

function KeyboardText({ inline, text, ...props }: KeyboardTextProps) {
  const ElStyled = inline ? DivStyled : KbdStyled;

  return (
    <Text {...props} inline>
      <ElStyled>{KEY_CODE_KEY_SYMBOL_MAPPING[text] || text}</ElStyled>
    </Text>
  );
}

export default KeyboardText;
