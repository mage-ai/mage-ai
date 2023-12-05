import { useEffect, useState } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import TextArea from '@oracle/elements/Inputs/TextArea';
import TextInput from '@oracle/elements/Inputs/TextInput';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import { ToggleStyle } from '../RunPipelinePopup/index.style';
import { isJsonString } from '@utils/string';

type OverwriteVariablesProps = {
  borderless?: boolean;
  compact?: boolean;
  enableVariablesOverwrite: boolean;
  runtimeVariables: { [keyof: string]: string };
  setEnableVariablesOverwrite: (enableVariablesOverwrite: boolean) => void;
  setRuntimeVariables: (runtimeVariables: any) => void;
};

function OverwriteVariables({
  borderless,
  compact,
  enableVariablesOverwrite,
  runtimeVariables,
  setEnableVariablesOverwrite,
  setRuntimeVariables,
}: OverwriteVariablesProps) {
  const [textAreaElementMapping, setTextAreaElementMapping] = useState({});

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
      <ToggleStyle borderless={borderless}>
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
      </ToggleStyle>

      {enableVariablesOverwrite && runtimeVariables
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
    </>
  );
}

export default OverwriteVariables;
