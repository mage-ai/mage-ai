import { useEffect, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { KEY_CODE_ENTER } from '@utils/hooks/keyboardShortcuts/constants';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';

type InputModalProps = {
  description?: string;
  isLoading?: boolean;
  maxWidth?: number;
  minWidth?: number;
  onClose: () => void;
  onSave: (value: string) => void;
  title: string;
  value: string;
};

function InputModal({
  description,
  isLoading,
  maxWidth,
  minWidth,
  onClose,
  onSave,
  title,
  value,
}: InputModalProps) {
  const refTextInput = useRef(null);
  const [inputValue, setInputValue] = useState<string>(value);

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  return (
    <Panel
      maxWidth={maxWidth}
      minWidth={minWidth}
    >
      <Text bold>
        {title}
      </Text>

      <Spacing mt={1}>
        <TextInput
          monospace
          onChange={e => setInputValue(e.target.value)}
          ref={refTextInput}
          value={inputValue}
        />
      </Spacing>

      {description &&
        <Spacing mt={2}>
          <Text muted small>
            {description}
          </Text>
        </Spacing>
      }

      <Spacing mt={3}>
        <FlexContainer>
          <KeyboardShortcutButton
            bold
            inline
            keyboardShortcutValidation={({
              keyMapping,
            }) => onlyKeysPresent([KEY_CODE_ENTER], keyMapping)}
            loading={isLoading}
            onClick={() => onSave(inputValue || value)}
            primary
            tabIndex={0}
            uuid="Inputs/InputModal/SaveInput"
          >
            Save
          </KeyboardShortcutButton>
          
          <Spacing ml={1} />

          <Button
            onClick={onClose}
          >
            Cancel
          </Button>
        </FlexContainer>
      </Spacing>
    </Panel>
  );
}

export default InputModal;
