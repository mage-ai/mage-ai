import React, { useCallback, useContext, useMemo, useState } from 'react';
import { ThemeContext } from 'styled-components';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import CodeBlock from '@oracle/components/CodeBlock';
import Col from '@components/shared/Grid/Col';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType, { VariableType } from '@interfaces/PipelineVariableType';
import Row from '@components/shared/Grid/Row';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import VariableRow from './VariableRow';
import api from '@api';
import { Add, Copy } from '@oracle/icons';
import { CellStyle, TableStyle } from './index.style';
import { DARK_CONTENT_BACKGROUND } from '@oracle/styles/colors/content';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScheduleTypeEnum, SCHEDULE_TYPE_TO_LABEL } from '@interfaces/PipelineScheduleType';
import { addTriggerVariables, getFormattedVariables } from '../utils';
import { onSuccess } from '@api/utils/response';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

const SAMPLE_SOURCE = `
    from mage_ai.data_preparation.variable_manager import (
        get_variable,
    )


    df = get_variable(
        'pipeline_uuid',
        'block_uuid',
        'variable_name',
    )
`;

const SAMPLE_KWARGS_SOURCE = `
    var = kwargs['variable_name']
`;

const BUILD_CODE_SNIPPET_PREVIEW = (
  pipelineUUID: string,
  blockUUID: string,
  variableName: string,
) => `
${variableName} = get_variable('${pipelineUUID}', '${blockUUID}', '${variableName}')
`;

type GlobalVariablesProps = {
  blocks: BlockType[];
  fetchVariables: () => void;
  pipeline: PipelineType;
  selectedBlock: BlockType;
  setErrorMessages: (errors: string[]) => void;
  variables: PipelineVariableType[];
  width: number;
};

function GlobalVariables({
  blocks,
  fetchVariables,
  pipeline,
  selectedBlock,
  setErrorMessages,
  variables,
  width,
}: GlobalVariablesProps) {
  const [showNewVariable, setShowNewVariable] = useState<boolean>(false);
  const [newVariableName, setNewVariableName] = useState<string>();
  const [newVariableValue, setNewVariableValue] = useState<string>();

  const pipelineUUID = pipeline?.uuid;
  const [createVariable] = useMutation(
    api.variables.pipelines.useCreate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          onErrorCallback: ({
            error: {
              exception,
            },
          }) => {
            // @ts-ignore
            setErrorMessages((errorMessages) => errorMessages.concat(exception));
          },
        },
      ),
    },
  );

  const [deleteVariable] = useMutation(
    (uuid: string) => api.variables.pipelines.useDelete(pipelineUUID, uuid)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchVariables();
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            // @ts-ignore
            setErrorMessages((errorMessages) => errorMessages.concat(message));
          },
        },
      ),
    },
  );

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      let updatedValue = newVariableValue
      try {
        updatedValue = JSON.parse(newVariableValue);
      } catch {
        // do nothing
      }

      // @ts-ignore
      createVariable({
        variable: {
          name: newVariableName,
          value: updatedValue,
        }
      }).then(() => {
        fetchVariables();
        setNewVariableName(null);
        setNewVariableValue(null);
      });
      setShowNewVariable(false);
    } else if (e.key === 'Escape') {
      setShowNewVariable(false);
    }
  }, [
    createVariable,
    fetchVariables,
    newVariableName,
    newVariableValue,
  ]);

  const tableWidth = useMemo(() => width - 4 * UNIT, [width]);
  const globalVariables = useMemo(
    () => getFormattedVariables(variables, (block) => block.uuid === 'global'),
    [variables],
  );

  const blockVariables = useMemo(
    () => getFormattedVariables(variables, (block) => block.uuid === selectedBlock?.uuid),
    [selectedBlock, variables],
  );

  const globalVariableTable = useMemo(() => (
    <TableStyle width={tableWidth}>
      {showNewVariable && (
        <Row>
          <Col md={1}>
            <CellStyle noPadding>
              <KeyboardShortcutButton
                backgroundColor={DARK_CONTENT_BACKGROUND}
                borderless
                centerText
                muted
                onClick={() => {
                  navigator.clipboard.writeText(newVariableName);
                  toast.success(
                    'Successfully copied to clipboard.',
                    {
                      position: toast.POSITION.BOTTOM_RIGHT,
                      toastId: newVariableName,
                    },
                  );
                }}
                uuid={`Sidekick/GlobalVariables/${newVariableName}`}
                withIcon
              >
                <Copy size={2.5 * UNIT} />
              </KeyboardShortcutButton>
            </CellStyle>
          </Col>
          <Col md={4}>
            <CellStyle>
              <TextInput
                compact
                borderless
                fullWidth
                monospace
                onChange={(e) => {
                  setNewVariableName(e.target.value);
                  e.preventDefault();
                }}
                onKeyDown={handleKeyDown}
                paddingHorizontal={0}
                placeholder="variable"
                small
                value={newVariableName}
              />
            </CellStyle>
          </Col>
          <Col md={7}>
            <CellStyle>
              <TextInput
                compact
                borderless
                fullWidth
                monospace
                onChange={(e) => {
                  setNewVariableValue(e.target.value);
                  e.preventDefault();
                }}
                onKeyDown={handleKeyDown}
                paddingHorizontal={0}
                placeholder="enter value"
                small
                value={newVariableValue}
              />
            </CellStyle>
          </Col>
        </Row>
      )}
      {globalVariables?.map((variable: VariableType) => (
        <VariableRow
          deleteVariable={() => deleteVariable(variable.uuid)}
          fetchVariables={fetchVariables}
          pipelineUUID={pipelineUUID}
          variable={variable}
        />
      ))}
    </TableStyle>
  ), [
    deleteVariable,
    globalVariables,
    newVariableName,
    newVariableValue,
    pipelineUUID,
    setNewVariableName,
    setNewVariableValue,
    setShowNewVariable,
    showNewVariable,
    tableWidth,
  ]);

  const blockVariableTable = useMemo(() => {
    const copyText = (uuid) =>
      `from mage_ai.data_preparation.variable_manager import (
    get_variable,
)

${BUILD_CODE_SNIPPET_PREVIEW(pipelineUUID, selectedBlock?.uuid, uuid)}`;

    return (
      <TableStyle width={tableWidth}>
        {blockVariables?.map((variable: VariableType) => (
          <VariableRow
            copyText={copyText(variable.uuid)}
            hideEdit
            pipelineUUID={pipelineUUID}
            variable={variable}
          />
        ))}
      </TableStyle>
    );
  }, [
    blockVariables,
    selectedBlock,
    tableWidth,
  ]);

  return (
    <Spacing p={PADDING_UNITS}>
      <Spacing mb={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Headline level={4} monospace>
            Global Variables
          </Headline>
          <Spacing ml={2} />
          <KeyboardShortcutButton
            Icon={Add}
            blackBorder
            inline
            onClick={() => setShowNewVariable(value => !value)}
            uuid="Sidekick/GlobalVariables/addNewVariable"
          >
            New
          </KeyboardShortcutButton>
        </FlexContainer>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Text muted>
          Press <Text bold default inline monospace>
            Enter
          </Text> or <Text bold default inline monospace>
            Return
          </Text> to save changes.
        </Text>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        {globalVariableTable}
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Text>
          Global variables will be passed into all non-scratchpad blocks as keyword arguments. To load a global variable, use the following syntax:
        </Text>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <CodeBlock
          language="python"
          small
          source={SAMPLE_KWARGS_SOURCE}
        />
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Headline level={4} monospace>
          Trigger Runtime Variables
        </Headline>
        <Spacing mb={PADDING_UNITS} />
        <Text>
          Depending on what kind of trigger you use for this pipeline, some default runtime variables will be provided.
        </Text>
      </Spacing>

      {Object.values(ScheduleTypeEnum).map((value) => (
        <Spacing mb={PADDING_UNITS}>
          <Spacing mb={PADDING_UNITS}>
            <Text large monospace>
              {capitalizeRemoveUnderscoreLower(SCHEDULE_TYPE_TO_LABEL[value]?.())}
            </Text>
          </Spacing>
          {addTriggerVariables([], value).map((variable) => (
            <VariableRow
              hideEdit
              variable={variable}
              pipelineUUID={pipelineUUID}
            />
          ))}
        </Spacing>
      ))}

      {blockVariables && blockVariables.length > 0 && (
        <>
          <Spacing my={2} >
            <Headline level={4} monospace>
              Block Output Variables
            </Headline>
          </Spacing>

          <Spacing mb={2}>
            {blockVariableTable}
          </Spacing>

          <Spacing mb={PADDING_UNITS}>
            <Text>
              Output variables can be used in any <Text
                bold
                inline
                monospace
              >
                {BlockTypeEnum.SCRATCHPAD}
              </Text> block.
            </Text>
          </Spacing>

          <Spacing mb={PADDING_UNITS}>
            <Text>
              To load the variable, use the following syntax:
            </Text>
          </Spacing>

          <Spacing mb={PADDING_UNITS}>
            <CodeBlock
              language="python"
              small
              source={SAMPLE_SOURCE}
            />
          </Spacing>
        </>
      )}
    </Spacing>
  );
}

export default GlobalVariables;
