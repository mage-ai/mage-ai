import React, { useState } from 'react';
import { TableStyle } from './index.style';


type SecretsProps = {
  width: number;

};

function Secrets({

}: SecretsProps) {
  const [newSecretName, setNewSecretName] = useState();
  const [newSecretValue, setNewSecretValue] = useState();

  

  return (
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
                uuid={`Sidekick/Secrets/${newVariableName}`}
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
  )
}