import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import Col from '@components/shared/Grid/Col';
import Flex from '@oracle/components/Flex';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Row from '@components/shared/Grid/Row';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import { CellStyle } from './index.style';
import { Check, Close, Copy, Edit, Trash } from '@oracle/icons';
import { DARK_CONTENT_BACKGROUND } from '@oracle/styles/colors/content';
import { LIME_DARK } from '@oracle/styles/colors/main';
import { UNIT } from '@oracle/styles/units/spacing';
import { VariableType } from '@interfaces/PipelineVariableType';
import { onSuccess } from '@api/utils/response';
import { useMutation } from 'react-query';
import api from '@api';

type VariableRowProps = {
  copyText?: string;
  deleteVariable?: () => void;
  fetchVariables?: () => void;
  hideEdit?: boolean;
  obfuscate?: boolean;
  pipelineUUID: string;
  variable: VariableType;
}

function VariableRow({
  copyText: copyTextProp,
  deleteVariable,
  fetchVariables,
  hideEdit,
  obfuscate,
  pipelineUUID,
  variable,
}: VariableRowProps) {
  const {
    uuid,
    type,
    value,
  } = variable;

  const refTextInput = useRef(null);
  const [showActions, setShowActions] = useState<boolean>(false);
  const [variableName, setVariableName] = useState<string>(uuid);
  const [variableValue, setVariableValue] = useState<string>(value);
  const [edit, setEdit] = useState<boolean>(false);

  const [updateVariable] = useMutation(
    api.variables.pipelines.useUpdate(pipelineUUID, uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setEdit(false);
            fetchVariables();
          }
        },
      ),
    },
  );

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      let updatedValue = variableValue
      try {
        updatedValue = JSON.parse(variableValue);
      } catch {
        // do nothing
      }
      // @ts-ignore
      updateVariable({
        variable: {
          name: variableName,
          value: updatedValue,
        },
      });
    } else if (e.key === 'Escape') {
      setEdit(false);
    }
  }, [
    variableName,
    variableValue,
  ]);

  useEffect(() => {
    if (edit) {
      refTextInput?.current?.focus();
    }
  }, [edit, refTextInput]);

  const copyText = copyTextProp || `kwargs['${uuid}']`;

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Row>
        <Col md={1} hiddenSmDown>
          <CellStyle noPadding>
            <KeyboardShortcutButton
              backgroundColor={DARK_CONTENT_BACKGROUND}
              borderless
              centerText
              muted
              onClick={() => {
                navigator.clipboard.writeText(copyText);
                toast.success(
                  'Successfully copied to clipboard.',
                  {
                    position: toast.POSITION.BOTTOM_RIGHT,
                    toastId: uuid,
                  },
                );
              }}
              small
              uuid={`Sidekick/GlobalVariables/${uuid}`}
              withIcon
            >
              <Copy size={2.5 * UNIT} />
            </KeyboardShortcutButton>
          </CellStyle>
        </Col>
        <Col md={4}>
          {edit ? (
            <CellStyle>
              <TextInput
                compact
                borderless
                fullWidth
                monospace
                onChange={(e) => {
                  setVariableName(e.target.value);
                  e.preventDefault();
                }}
                onKeyDown={handleKeyDown}
                paddingHorizontal={0}
                placeholder="variable"
                small
                value={variableName}
              />
            </CellStyle>
          ) : (
            <CellStyle>
              <Text color={LIME_DARK} monospace small textOverflow>
                {uuid}
              </Text>
            </CellStyle>
          )}
        </Col>
        <Col md={7}>
          {edit ? (
            <CellStyle>
              <TextInput
                compact
                borderless
                fullWidth
                monospace
                onChange={(e) => {
                  setVariableValue(e.target.value);
                  e.preventDefault();
                }}
                onKeyDown={handleKeyDown}
                paddingHorizontal={0}
                placeholder="enter value"
                ref={refTextInput}
                small
                value={variableValue}
              />
            </CellStyle>
          ) : (
            <CellStyle>
              {obfuscate ? (
                <Text monospace small>
                  ********
                </Text>
              ) : (
                <Text monospace small>
                  {value}
                </Text>
              )}
              <Flex>
                {!hideEdit && showActions && (
                  <KeyboardShortcutButton
                    backgroundColor={DARK_CONTENT_BACKGROUND}
                    borderless
                    inline
                    muted
                    onClick={() => {
                      setEdit(true);
                    }}
                    small
                    uuid={`Sidekick/GlobalVariables/edit_${uuid}`}
                    withIcon
                  >
                    <Edit size={2.5 * UNIT} />
                  </KeyboardShortcutButton>
                )}
                {deleteVariable && showActions && (
                  <KeyboardShortcutButton
                    backgroundColor={DARK_CONTENT_BACKGROUND}
                    borderless
                    inline
                    muted
                    onClick={deleteVariable}
                    small
                    uuid={`Sidekick/GlobalVariables/delete_${uuid}`}
                    withIcon
                  >
                    <Trash size={2.5 * UNIT} />
                  </KeyboardShortcutButton>
                )}
              </Flex>
            </CellStyle>
          )}
        </Col>
      </Row>
    </div>
  );
}

export default VariableRow;
