import { useEffect, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import LLMType, { LLMUseCaseEnum } from '@interfaces/LLMType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import {
  AISparkle,
} from '@oracle/icons';
import {
  ContainerStyle,
  FooterStyle,
  HeaderStyle,
  RowStyle,
} from '@components/PipelineDetail/ConfigureBlock/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { randomNameGenerator } from '@utils/string';

type ControlPanelProps = {
  createPipeline?: (payload: {
    pipeline: {
      llm?: LLMType;
      name: string;
    };
  }) => Promise<any>;
  isLoading?: boolean;
  onClose?: () => void;
};

function ControlPanel({
  createPipeline,
  isLoading,
  onClose,
}: ControlPanelProps) {
  const refTextInput = useRef(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [objectAttributes, setObjectAttributes] = useState<{
    llm?: LLMType;
    name: string;
  }>({
    name: randomNameGenerator(),
  });

  useEffect(() => {
    refTextInput?.current?.focus();
  }, []);

  return (
    <ContainerStyle>
      <HeaderStyle>
        <FlexContainer
          alignItems="center"
          justifyContent="center"
        >
          <AISparkle size={5 * UNIT} warning />
        </FlexContainer>
      </HeaderStyle>

      <RowStyle>
        <Spacing py={1}>
          <Spacing mb={1}>
            <Text default>
              New pipeline
            </Text>
          </Spacing>

          <Text textOverflow>
            Using AI
          </Text>
        </Spacing>
      </RowStyle>

      <RowStyle>
        <Text default>
          Name
        </Text>

        <TextInput
          alignRight
          noBackground
          noBorder
          // @ts-ignore
          onChange={e => setObjectAttributes(prev => ({
            ...prev,
            name: e.target.value,
          }))}
          paddingVertical={UNIT}
          placeholder="Enter pipeline name..."
          // ref={refTextInput}
          value={objectAttributes?.name || ''}
        />
      </RowStyle>

      <RowStyle>
        <FlexContainer flexDirection="column" fullWidth>
          <Spacing mb={2} pt={1}>
            <Text default>
              Describe what the pipeline should do
            </Text>
          </Spacing>

          <Spacing pb={1} pr={PADDING_UNITS}>
            <TextArea
              fullWidth
              onChange={e => setObjectAttributes(prev => ({
                ...prev,
                llm: {
                  request: {
                    pipeline_description: e.target.value,
                  },
                  use_case: LLMUseCaseEnum.GENERATE_PIPELINE_WITH_DESCRIPTION,
                },
              }))}
              placeholder="Type the pipeline purpose..."
              ref={refTextInput}
              rows={8}
              value={objectAttributes?.llm?.request?.pipeline_description || ''}
            />

            {(isLoading || loading) && (
              <Spacing mt={1}>
                <Text warning>
                  Pipeline is being generated using AI based on your description above...
                </Text>
              </Spacing>
            )}
          </Spacing>
        </FlexContainer>
      </RowStyle>

      <FooterStyle>
        <FlexContainer fullWidth>
          <KeyboardShortcutButton
            bold
            centerText
            disabled={!objectAttributes?.name ||
              !objectAttributes?.llm?.request?.pipeline_description
            }
            loading={isLoading || loading}
            onClick={() => {
              setLoading(true);

              createPipeline({
                pipeline: objectAttributes,
              }).then(() => setLoading(false));
            }}
            primary
            tabIndex={0}
            uuid="AIControlPanel/CreatePipeline"
          >
            Create pipeline
          </KeyboardShortcutButton>

          {onClose && (
            <Spacing ml={1}>
              <Button
                onClick={onClose}
                tabIndex={0}
              >
                Cancel
              </Button>
            </Spacing>
          )}
        </FlexContainer>
      </FooterStyle>
    </ContainerStyle>
  );
}

export default ControlPanel;
