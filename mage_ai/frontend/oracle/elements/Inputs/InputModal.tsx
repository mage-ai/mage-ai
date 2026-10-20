import { useEffect, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Panel from '@oracle/components/Panel';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';

type InputModalProps = {
  description?: string;
  isLoading?: boolean;
  maxWidth?: number;
  minWidth?: number;
  noEmptyValue?: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
  textArea?: boolean;
  title: string;
  value: string;
};

function InputModal({
  description,
  isLoading,
  maxWidth,
  minWidth,
  noEmptyValue,
  onClose,
  onSave,
  textArea,
  title,
  value,
}: InputModalProps) {
  const refTextInput = useRef(null);
  const [inputValue, setInputValue] = useState<string>(value);
  const TextEl = textArea ? TextArea : TextInput;

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
        <TextEl
          monospace
          onChange={e => setInputValue(e.target.value)}
          ref={refTextInput}
          rows={textArea ? 7 : null}
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
            loading={isLoading}
            onClick={() => {
              if (inputValue === value || (noEmptyValue && !inputValue)) {
                onClose();
                return;
              }
              onSave(inputValue);
            }}
            outline
            primary
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
