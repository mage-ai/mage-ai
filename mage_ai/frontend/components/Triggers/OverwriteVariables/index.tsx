import { useEffect, useState } from 'react';

import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { Add, Trash } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ToggleStyle } from '../RunPipelinePopup/index.style';
import { ignoreKeys } from '@utils/hash';
import { isJsonString } from '@utils/string';

type OverwriteVariablesProps = {
  borderless?: boolean;
  compact?: boolean;
  enableVariablesOverwrite: boolean;
  originalVariables?: { [keyof: string]: string };
  runtimeVariables: { [keyof: string]: string };
  setEnableVariablesOverwrite: (enableVariablesOverwrite: boolean) => void;
  setRuntimeVariables: (runtimeVariables: any) => void;
};

function OverwriteVariables({
  borderless,
  compact,
  enableVariablesOverwrite,
  originalVariables,
  runtimeVariables,
  setEnableVariablesOverwrite,
  setRuntimeVariables,
}: OverwriteVariablesProps) {
  const [textAreaElementMapping, setTextAreaElementMapping] = useState({});
  const [newVariableUUID, setNewVariableUUID] = useState(null);
  const [newVariableValue, setNewVariableValue] = useState(null);

  useEffect(() => {
    const textAreaElementMappingInit = Object.entries(runtimeVariables || {})
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

  /*
   * The runtimeVariables prop is intentionally excluded from the dependency array
   * because adding it would convert the input element back to a normal TextInput
   * component once the user edits the variable value.
   */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <>
      {/*<ToggleStyle borderless={borderless}>
        <FlexContainer alignItems="center">
          <Spacing mr={2}>
            <ToggleSwitch
              checked={enableVariablesOverwrite}
              compact={compact}
              onCheck={setEnableVariablesOverwrite}
            />
          </Spacing>
          <Text
            bold={!compact}
            large={!compact}
          >
            Overwrite runtime variables
          </Text>
        </FlexContainer>
      </ToggleStyle>*/}

      {enableVariablesOverwrite && runtimeVariables
        && Object.entries(runtimeVariables).length > 0
        && (
        <Table
          columnFlex={[null, 1, null]}
          columns={[
            {
              uuid: 'Variable',
            },
            {
              uuid: 'Value',
            },
            {
              label: () => '',
              uuid: 'Action'
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
            !originalVariables?.[uuid] && (
              <Button
                iconOnly
                onClick={() => {
                  setRuntimeVariables(prev => ignoreKeys(prev, [uuid]))
                }}
              >
                <Trash default />
              </Button>
            ),
          ])}
        />
      )}

      <Spacing p={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Flex flex={1}>
            <TextInput
              fullWidth
              monospace
              onChange={e => setNewVariableUUID(e.target.value)}
              placeholder="New variable UUID"
              value={newVariableUUID || ''}
            />
          </Flex>

          <Spacing mr={1} />

          <Flex flex={1}>
            <TextInput
              fullWidth
              monospace
              onChange={e => setNewVariableValue(e.target.value)}
              placeholder="Variable value"
              value={newVariableValue || ''}
            />
          </Flex>

          <Spacing mr={1} />

          <Button
            beforeIcon={<Add />}
            disabled={!newVariableUUID || !newVariableValue}
            onClick={() => {
              setRuntimeVariables(vars => ({
                ...vars,
                [newVariableUUID]: newVariableValue,
              }));
              setNewVariableUUID(null);
              setNewVariableValue(null);
            }}
          >
            Add runtime variable
          </Button>
        </FlexContainer>
      </Spacing>

      <Divider light />
    </>
  );
}

export default OverwriteVariables;
