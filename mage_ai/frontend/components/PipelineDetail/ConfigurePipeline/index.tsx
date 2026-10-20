import { useCallback, useEffect, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import dark from '@oracle/styles/themes/dark';
import {
  ContainerStyle,
  FooterStyle,
  HeaderStyle,
  RowStyle,
} from '../ConfigureBlock/index.style';
import { KEY_ENTER, KEY_ESCAPE } from '@utils/hooks/keyboardShortcuts/constants';
import {
  PipelineTypeEnum,
  PIPELINE_TYPE_ICON_MAPPING,
  PIPELINE_TYPE_LABEL_MAPPING,
} from '@interfaces/PipelineType';
import { UNIT } from '@oracle/styles/units/spacing';
import { randomNameGenerator } from '@utils/string';

type ConfigurePipelineProps = {
  onClose: () => void;
  onSave: (opts: {
    name: string;
    description?: string;
    tags?: string[];
    type?: PipelineTypeEnum;
  }) => void;
  pipelineType: PipelineTypeEnum;
};

function ConfigurePipeline({
  onClose,
  onSave,
  pipelineType,
}: ConfigurePipelineProps) {
  const Icon = PIPELINE_TYPE_ICON_MAPPING[pipelineType];
  const refNameTextInput = useRef(null);
  const [pipelineAttributes, setPipelineAttributes] = useState<{
    name: string;
    description?: string;
    tags?: string;
  }>({
    name: randomNameGenerator(),
  });

  useEffect(() => {
    refNameTextInput?.current?.focus();
  }, []);

  const handleOnSave = useCallback(() => {
    const tagsString = pipelineAttributes?.tags;
    let tagsArr: string[] = [];
    if (tagsString) {
      tagsArr = tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => !!tag);
    }
    onSave({
      ...pipelineAttributes,
      name: pipelineAttributes?.name || randomNameGenerator(),
      tags: tagsArr,
    });
    onClose?.();
  }, [pipelineAttributes, onClose, onSave]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      event.stopPropagation();
      if (event.key === KEY_ESCAPE) {
        onClose?.();
      } else if (event.key === KEY_ENTER) {
        const buttonText = event.target.innerText;
        if (!buttonText.startsWith('Create') && buttonText !== 'Cancel') {
          handleOnSave();
        }
      }
    };

    document?.addEventListener('keydown', handleKeyDown);

    return () => {
      document?.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleOnSave, onClose]);

  return (
    <ContainerStyle width={55 * UNIT}>
      <HeaderStyle lightBackground>
        <FlexContainer
          alignItems="center"
          justifyContent="space-between"
        >
          <Text bold cyan largeLg>
            {`${PIPELINE_TYPE_LABEL_MAPPING[pipelineType]} pipeline`}
          </Text>
          <Icon fill={dark.accent.cyan} size={10 * UNIT} />
        </FlexContainer>
      </HeaderStyle>

      <RowStyle lightBackground>
        <Text default>
          Name
        </Text>
        <TextInput
          alignRight
          fullWidth
          noBackground
          noBorder
          onChange={e => {
            setPipelineAttributes((prev) => ({
              ...prev,
              name: e.target.value,
            }));
          }}
          paddingVertical={UNIT}
          placeholder="Pipeline name..."
          ref={refNameTextInput}
          value={pipelineAttributes?.name || ''}
        />
      </RowStyle>

      <RowStyle lightBackground>
        <Text default>
          Description
        </Text>
        <Spacing ml={9} />
        <Spacing fullWidth px={2} py={1}>
          <TextArea
            onChange={e => {
              setPipelineAttributes((prev) => ({
                ...prev,
                description: e.target.value,
              }));
            }}
            rows={2}
            value={pipelineAttributes?.description || ''}
          />
        </Spacing>
      </RowStyle>

      <RowStyle lightBackground>
        <Text default>
          Tags
        </Text>
        <TextInput
          alignRight
          fullWidth
          noBackground
          noBorder
          onChange={e => {
            const tagsString = e.target.value;
            setPipelineAttributes((prev) => ({
              ...prev,
              tags: tagsString,
            }));
          }}
          paddingVertical={UNIT}
          placeholder="e.g. tag_1, tag_2"
          value={pipelineAttributes?.tags || ''}
        />
      </RowStyle>

      <FooterStyle topBorder>
        <FlexContainer fullWidth>
          <Flex flex="1">
            <Button
              fullWidth
              onClick={onClose}
            >
              Cancel
            </Button>
          </Flex>

          <Spacing ml={1} />

          <Flex flex="1">
            <KeyboardShortcutButton
              bold
              centerText
              disabled={!pipelineAttributes?.name}
              fullWidth
              onClick={handleOnSave}
              primary
              uuid="ConfigurePipeline/CreatePipeline"
            >
              Create
            </KeyboardShortcutButton>
          </Flex>
        </FlexContainer>
      </FooterStyle>
    </ContainerStyle>
  );
}

export default ConfigurePipeline;
