import { useEffect, useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import Panel from '@oracle/components/Panel';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import dark from '@oracle/styles/themes/dark';
import { ToggleStyle } from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { isJsonString, randomNameGenerator } from '@utils/string';
import { parseVariables } from '@components/Sidekick/utils';

type RunPipelinePopupProps = {
  initialPipelineSchedulePayload: PipelineScheduleType,
  onCancel: () => void;
  onSuccess: (
    payload: { pipeline_schedule: PipelineScheduleType },
  ) => void;
  variables?: { [keyof: string]: string };
};

const BUTTON_PADDING = `${UNIT}px ${UNIT * 3}px`;

function RunPipelinePopup({
  initialPipelineSchedulePayload,
  onCancel,
  onSuccess,
  variables,
}: RunPipelinePopupProps) {
  const [overwriteVariables, setOverwriteVariables] = useState<boolean>(false);
  const [textAreaElementMapping, setTextAreaElementMapping] = useState({});
  const [runtimeVariables, setRuntimeVariables] = useState<{
    [keyof: string]: string,
  }>(variables || {});

  const finalPipelineSchedulePayload = useMemo(() => ({
    ...initialPipelineSchedulePayload,
    name: randomNameGenerator(),
    variables: overwriteVariables ? parseVariables(runtimeVariables) : null,
  }), [
    initialPipelineSchedulePayload,
    overwriteVariables,
    runtimeVariables,
  ]);

  const buildValueRowEl = (uuid: string, value: string) => {
    const sharedValueElProps = {
      borderless: true,
      key: `variable_uuid_input_${uuid}`,
      monospace: true,
      onChange: (e) => {
        e.preventDefault();
        setRuntimeVariables(vars => ({
          ...vars,
          [uuid]: e.target.value,
        }));
      },
      paddingHorizontal: 0,
      placeholder: 'Variable value',
      value,
    };

    if (textAreaElementMapping[uuid]) {
      return (
        <TextArea
          {...sharedValueElProps}
          rows={1}
          value={value}
        />
      );
    }

    return (
      <TextInput {...sharedValueElProps} />
    );
  };

  useEffect(() => {
    const textAreaElementMappingInit = Object.entries(runtimeVariables)
      .reduce((acc, keyValPair) => {
        const [uuid, val] = keyValPair;
        const isUsingTextAreaEl = isJsonString(val)
          && typeof JSON.parse(val) === 'object'
          && !Array.isArray(JSON.parse(val))
          && JSON.parse(val) !== null;

        return {
          ...acc,
          [uuid]: isUsingTextAreaEl,
        };
      }, {});

    setTextAreaElementMapping(textAreaElementMappingInit);
  }, []);

  return (
    <Panel
      footer={
        <FlexContainer
          alignItems="center"
          fullWidth
          justifyContent="flex-end"
        >
          <Button
            onClick={() => {
              onSuccess({
                pipeline_schedule: finalPipelineSchedulePayload,
              });
              onCancel();
            }}
            padding={BUTTON_PADDING}
            primaryAlternate
          >
            Run now
          </Button>
          <Spacing mr={1} />
          <Button
            borderColor={dark.background.page}
            onClick={onCancel}
            padding={BUTTON_PADDING}
            secondary
          >
            Cancel
          </Button>
        </FlexContainer>
      }
      header={
        <Headline level={5}>
          Run pipeline now
        </Headline>
      }
      maxHeight="90vh"
      minWidth={UNIT * 85}
      subtitle="Creates a new trigger and immediately runs the current pipeline once."
    >
      <ToggleStyle>
        <FlexContainer alignItems="center">
          <Spacing mr={2}>
            <ToggleSwitch
              checked={overwriteVariables}
              onCheck={setOverwriteVariables}
            />
          </Spacing>
          <Text bold large>
            Overwrite runtime variables
          </Text>
        </FlexContainer>
      </ToggleStyle>

      {overwriteVariables && runtimeVariables
        && Object.entries(runtimeVariables).length > 0 && (
        <Spacing mt={2}>
          <Table
            columnFlex={[null, 1]}
            columns={[
              {
                uuid: 'Variable',
              },
              {
                uuid: 'Value',
              },
            ]}
            rows={Object.entries(runtimeVariables).map(([uuid, value]) => [
              <Text
                default
                key={`variable_${uuid}`}
                monospace
              >
                {uuid}
              </Text>,
              buildValueRowEl(uuid, value),
            ])}
          />
        </Spacing>
      )}
    </Panel>
  );
}

export default RunPipelinePopup;
