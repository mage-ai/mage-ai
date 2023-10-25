import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';

import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import CodeBlock from '@oracle/components/CodeBlock';
import Col from '@components/shared/Grid/Col';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import PipelineVariableType, {
  GLOBAL_VARIABLES_UUID,
  VariableType,
} from '@interfaces/PipelineVariableType';
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
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { onSuccess } from '@api/utils/response';
import { removeKeyboardFocus } from '@context/shared/utils';

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
const SAMPLE_SQL_VARIABLE_SOURCE = `
    {{ variable_name }}
`;
const SAMPLE_R_VARIABLE_SOURCE = `
    var <- global_vars['variable_name']
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
              message,
              exception,
            },
          }) => {
            // @ts-ignore
            setErrorMessages((errorMessages) => {
              let messagesToDisplay = errorMessages || [];
              if (exception) {
                messagesToDisplay = messagesToDisplay.concat(exception);
              }
              if (message) {
                messagesToDisplay = messagesToDisplay.concat(message);
              }
              return messagesToDisplay;
            });
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
      let updatedValue = newVariableValue;
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
        },
      }).then(() => {
        fetchVariables();
        setNewVariableName(null);
        setNewVariableValue(null);
      });
      removeKeyboardFocus();
      setShowNewVariable(false);
    } else if (e.key === 'Escape') {
      removeKeyboardFocus();
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
    () => getFormattedVariables(variables, (block) => block.uuid === GLOBAL_VARIABLES_UUID),
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
                borderless
                compact
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
                borderless
                compact
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
          key={variable.uuid}
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
            key={variable.uuid}
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
          Global variables will be passed into all non-scratchpad blocks as keyword arguments
          (Python), interpolated variables (SQL), or vector elements (R). To load a global
          variable, use the following syntax:
        </Text>
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Text bold large>
          For Python (
          <Link
            href="https://docs.mage.ai/production/configuring-production-settings/runtime-variable"
            large
            openNewWindow
            primary
          >
            docs
          </Link>):
        </Text>
        <CodeBlock
          language="python"
          small
          source={SAMPLE_KWARGS_SOURCE}
        />
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Text bold large>
          For SQL (
          <Link
            href="https://docs.mage.ai/guides/sql-blocks#variables"
            large
            openNewWindow
            primary
          >
            docs
          </Link>):
        </Text>
        <CodeBlock
          language="sql"
          small
          source={SAMPLE_SQL_VARIABLE_SOURCE}
        />
      </Spacing>

      <Spacing mb={PADDING_UNITS}>
        <Text bold large>
          For R (
          <Link
            href="https://docs.mage.ai/guides/r-blocks#runtime-variables"
            large
            openNewWindow
            primary
          >
            docs
          </Link>):
        </Text>
        <CodeBlock
          language="r"
          small
          source={SAMPLE_R_VARIABLE_SOURCE}
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

      {Object.values(ScheduleTypeEnum).map((value, idx) => (
        <Spacing
          key={`${value}_${idx}`}
          mb={PADDING_UNITS}
        >
          <Spacing mb={PADDING_UNITS}>
            <Text large monospace>
              {capitalizeRemoveUnderscoreLower(SCHEDULE_TYPE_TO_LABEL[value]?.())}
            </Text>
          </Spacing>
          {addTriggerVariables([], value).map((variable, idx) => (
            <VariableRow
              hideEdit
              key={`var_${value}_${idx}`}
              pipelineUUID={pipelineUUID}
              variable={variable}
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
                warning
              >
                {BlockTypeEnum.SCRATCHPAD}
              </Text> block. They are for scratchpad blocks, specifically.
              To get upstream block outputs inside of other blocks, use
              the positional arguments.
            </Text>
          </Spacing>

          <Spacing mb={PADDING_UNITS}>
            <Text>
              To load the variable in a scratchpad block, use the following syntax:
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
