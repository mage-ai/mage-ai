import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useMutation } from 'react-query';

import CodeBlock from '@oracle/components/CodeBlock';
import Col from '@components/shared/Grid/Col';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Row from '@components/shared/Grid/Row';
import SecretType from '@interfaces/SecretType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import VariableRow from './VariableRow';
import api from '@api';
import { Add, Copy } from '@oracle/icons';
import { CellStyle, TableStyle } from './index.style';
import { DARK_CONTENT_BACKGROUND } from '@oracle/styles/colors/content';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { VariableType } from '@interfaces/PipelineVariableType';
import { onSuccess } from '@api/utils/response';
import { removeKeyboardFocus } from '@context/shared/utils';

type SecretsProps = {
  fetchSecrets: () => void;
  pipelineUUID: string;
  secrets: SecretType[];
  setErrorMessages: (errors: string[]) => void;
  width: number;
};

function Secrets({ fetchSecrets, pipelineUUID, secrets, setErrorMessages, width }: SecretsProps) {
  const [showNewSecret, setShowNewSecret] = useState<boolean>(false);
  const [newSecretName, setNewSecretName] = useState<string>();
  const [newSecretValue, setNewSecretValue] = useState<string>();

  const tableWidth = useMemo(() => width - PADDING_UNITS * UNIT * 2, [width]);

  const [createSecret] = useMutation(api.secrets.useCreate(), {
    onSuccess: (response: any) =>
      onSuccess(response, {
        onErrorCallback: ({ error: { message, exception } }) => {
          // @ts-ignore
          setErrorMessages(errorMessages => {
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
      }),
  });

  const [deleteSecret] = useMutation((name: string) => api.secrets.useDelete(name)(), {
    onSuccess: (response: any) =>
      onSuccess(response, {
        callback: () => {
          fetchSecrets();
        },
        onErrorCallback: ({ error: { errors, message } }) => {
          // @ts-ignore
          setErrorMessages(errorMessages => errorMessages.concat(message));
        },
      }),
  });

  const handleKeyDown = useCallback(
    e => {
      if (e.key === 'Enter') {
        // @ts-ignore
        createSecret({
          secret: {
            name: newSecretName,
            value: newSecretValue,
          },
        }).then(() => {
          fetchSecrets();
          setNewSecretName(null);
          setNewSecretValue(null);
        });
        removeKeyboardFocus();
        setShowNewSecret(false);
      } else if (e.key === 'Escape') {
        removeKeyboardFocus();
        setShowNewSecret(false);
      }
    },
    [createSecret, fetchSecrets, newSecretName, newSecretValue],
  );

  const handleDelete = useCallback(
    secretName => {
      removeKeyboardFocus();
      deleteSecret(secretName);
    },
    [deleteSecret],
  );

  const SAMPLE_SECRET_VALUE = `
    "{{ mage_secret_var('<secret_name>') }}"
  `;

  const SECRET_IN_CODE = `
    from mage_ai.data_preparation.shared.secrets import get_secret_value

    get_secret_value('<secret_name>')
  `;

  return (
    <Spacing p={PADDING_UNITS}>
      <Spacing mb={PADDING_UNITS}>
        <FlexContainer alignItems="center">
          <Headline level={4} monospace>
            Secrets
          </Headline>
          <Spacing ml={2} />
          <KeyboardShortcutButton
            Icon={Add}
            blackBorder
            inline
            onClick={() => setShowNewSecret(value => !value)}
            uuid="Sidekick/Secrets/addNewSecret"
          >
            New
          </KeyboardShortcutButton>
        </FlexContainer>
      </Spacing>
      <Spacing mb={PADDING_UNITS}>
        <Text>
          <Text inline warning>
            WARNING:
          </Text>{' '}
          the encryption key is stored in a file on your machine. If you need more secure
          encryption, we recommend using a secrets manager.
        </Text>
      </Spacing>
      {showNewSecret && (
        <Spacing mb={PADDING_UNITS}>
          <Text muted>
            Press{' '}
            <Text bold default inline monospace>
              Enter
            </Text>{' '}
            or{' '}
            <Text bold default inline monospace>
              Return
            </Text>{' '}
            to save changes.
          </Text>
        </Spacing>
      )}
      <Spacing mb={PADDING_UNITS}>
        <TableStyle width={tableWidth}>
          {showNewSecret && (
            <Row>
              <Col md={1}>
                <CellStyle noPadding>
                  <KeyboardShortcutButton
                    backgroundColor={DARK_CONTENT_BACKGROUND}
                    borderless
                    centerText
                    muted
                    onClick={() => {
                      navigator.clipboard.writeText(`{{ mage_secret_var(${newSecretName}) }}`);
                      toast.success('Successfully copied to clipboard.', {
                        position: toast.POSITION.BOTTOM_RIGHT,
                        toastId: newSecretName,
                      });
                    }}
                    uuid={`Sidekick/Secrets/${newSecretName}`}
                    withIcon
                  >
                    <Copy size={2.5 * UNIT} />
                  </KeyboardShortcutButton>
                </CellStyle>
              </Col>
              <Col md={5}>
                <CellStyle>
                  <TextInput
                    borderless
                    compact
                    fullWidth
                    monospace
                    onChange={e => {
                      setNewSecretName(e.target.value);
                      e.preventDefault();
                    }}
                    onKeyDown={handleKeyDown}
                    paddingHorizontal={0}
                    placeholder="secret name"
                    small
                    value={newSecretName}
                  />
                </CellStyle>
              </Col>
              <Col md={6}>
                <CellStyle>
                  <TextInput
                    borderless
                    compact
                    fullWidth
                    monospace
                    onChange={e => {
                      setNewSecretValue(e.target.value);
                      e.preventDefault();
                    }}
                    onKeyDown={handleKeyDown}
                    paddingHorizontal={0}
                    placeholder="secret value"
                    small
                    value={newSecretValue}
                  />
                </CellStyle>
              </Col>
            </Row>
          )}
          {secrets?.map((secret: SecretType) => (
            <VariableRow
              copyText={secret.name}
              deleteVariable={() => handleDelete(secret.name)}
              fetchVariables={fetchSecrets}
              hideEdit
              key={secret.name}
              obfuscate
              pipelineUUID={pipelineUUID}
              variable={
                {
                  uuid: secret.name,
                  value: secret.value,
                } as VariableType
              }
            />
          ))}
        </TableStyle>
      </Spacing>
      <Spacing mb={PADDING_UNITS}>
        <Text>
          Secrets are not editable, they can only be created and deleted. Secrets are shared across
          the project, and can be used in configuration fields. To reference a secret, use the
          following templating syntax:
        </Text>
      </Spacing>
      <Spacing mb={PADDING_UNITS}>
        <CodeBlock language="yaml" maxWidth={tableWidth} small source={SAMPLE_SECRET_VALUE} />
      </Spacing>
      <Spacing mb={PADDING_UNITS}>
        <Text>
          To reference a secret in code, you can import the `get_secret_value` helper method:
        </Text>
      </Spacing>
      <Spacing mb={PADDING_UNITS}>
        <CodeBlock language="python" maxWidth={tableWidth} small source={SECRET_IN_CODE} />
      </Spacing>
    </Spacing>
  );
}

export default Secrets;
