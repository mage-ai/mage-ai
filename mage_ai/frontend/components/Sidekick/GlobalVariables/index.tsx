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
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';

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
  const themeContext = useContext(ThemeContext);
  const blocksByUUID = useMemo(() => indexBy(blocks, ({ uuid }) => uuid), [blocks]);
  const pipelineUUID = pipeline?.uuid;

  const [showNewVariable, setShowNewVariable] = useState<boolean>(false);

  const [newVariableName, setNewVariableName] = useState<string>();
  const [newVariableValue, setNewVariableValue] = useState<string>();

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
      // @ts-ignore
      createVariable({
        variable: {
          name: newVariableName,
          value: newVariableValue,
        }
      }).then(() => {
        fetchVariables();
      });
      setShowNewVariable(false);
    }
  }, [
    createVariable,
    fetchVariables,
    newVariableName,
    newVariableValue
  ]);

  const globalVariables = useMemo(() =>
    variables?.find(({ block }) => block.uuid === 'global')?.variables,
    [variables],
  );

  const blockVariables = useMemo(() =>
    variables?.find(({ block }) => block.uuid === selectedBlock?.uuid)?.variables,
    [selectedBlock, variables],
  );

  const globalVariableTable = useMemo(() => (
    <TableStyle width={width - 6 * UNIT}>
      {showNewVariable && (
        <Row>
          <Col md={1}>
            <CellStyle noPadding>
              <KeyboardShortcutButton
                backgroundColor="#232429"
                borderless
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
          <Col md={5}>
            <CellStyle>
              <TextInput
                compact
                borderless
                monospace
                onChange={(e) => {
                  setNewVariableName(e.target.value);
                  e.preventDefault();
                }}
                onKeyDown={handleKeyDown}
                paddingHorizontal={0}
                placeholder="variable"
                value={newVariableName}
              />
            </CellStyle>
          </Col>
          <Col md={6}>
            <CellStyle>
              <TextInput
                compact
                borderless
                monospace
                onChange={(e) => {
                  setNewVariableValue(e.target.value);
                  e.preventDefault();
                }}
                onKeyDown={handleKeyDown}
                paddingHorizontal={0}
                placeholder="enter value"
                value={newVariableValue}
              />
            </CellStyle>
          </Col>
          {/* <Col md={2}>
            <CellStyle>
              <Text monospace>
                ...
              </Text>
            </CellStyle>
          </Col> */}
        </Row>
      )}
      {globalVariables?.map((variable: VariableType) => (
        <VariableRow
          deleteVariable={() => deleteVariable(variable.uuid)}
          variable={variable}
        />
      ))}
    </TableStyle>
  ), [
    deleteVariable,
    globalVariables,
    newVariableName,
    newVariableValue,
    setNewVariableName,
    setNewVariableValue,
    setShowNewVariable,
    showNewVariable,
  ]);

  const blockVariableTable = useMemo(() => {
    const copyText = (uuid) => 
      `${uuid} = get_variable(${pipelineUUID}, ${selectedBlock?.uuid}, ${uuid})`
      
    return (
      <TableStyle width={width - 6 * UNIT}>
        {blockVariables?.map((variable: VariableType) => (
          <VariableRow
            copyText={copyText(variable.uuid)}
            variable={variable}
          />
        ))}
      </TableStyle>
    );
  }, [
    blockVariables,
    selectedBlock,
  ])

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

      {globalVariableTable}

      {blockVariables && blockVariables.length > 0 && (
        <>
          <Spacing my={2} >
            <Headline level={4} monospace>
              Block Output Variables
            </Headline>
          </Spacing>
          <Spacing mb={PADDING_UNITS}>
            <Text>
              The variables listed below can be used in any <Text
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

          {blockVariableTable}
        </>
      )}
    </Spacing>
  );
}

export default GlobalVariables;
