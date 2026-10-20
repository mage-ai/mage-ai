import { useCallback, useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'react-toastify';

import api from '@api';
import { onSuccess } from '@api/utils/response';
import {
  SECRET_NAME_INVALID_MESSAGE,
  SECRETS_INFO,
} from '@components/Secrets/constants';
import { EncryptionWarning, UsageExamples } from '@components/Secrets/SecretInformation';
import { isSecretNameValid } from '@components/Secrets/utils';
import Col from '@components/shared/Grid/Col';
import Row from '@components/shared/Grid/Row';
import { removeKeyboardFocus } from '@context/shared/utils';
import { VariableType } from '@interfaces/PipelineVariableType';
import SecretType from '@interfaces/SecretType';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Headline from '@oracle/elements/Headline';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Add, Copy } from '@oracle/icons';
import { DARK_CONTENT_BACKGROUND } from '@oracle/styles/colors/content';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { CellStyle, TableStyle } from './index.style';
import VariableRow from './VariableRow';

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
        callback: () => {
          fetchSecrets();
          toast.success('Secret created successfully', {
            position: toast.POSITION.BOTTOM_RIGHT,
            toastId: 'secret_created',
          });
        },
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
          toast.success('Secret deleted successfully', {
            position: toast.POSITION.BOTTOM_RIGHT,
            toastId: 'secret_deleted',
          });
        },
        onErrorCallback: ({ error: { message } }) => {
          // @ts-ignore
          setErrorMessages(errorMessages => errorMessages.concat(message));
        },
      }),
  });

  const handleKeyDown = useCallback(
    e => {
      if (e.key === 'Enter' && newSecretValue && isSecretNameValid(newSecretName)) {
        // @ts-ignore
        createSecret({
          secret: {
            name: newSecretName,
            value: newSecretValue,
          },
        }).then(() => {
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
    [createSecret, newSecretName, newSecretValue],
  );

  const handleDelete = useCallback(
    secretName => {
      removeKeyboardFocus();
      deleteSecret(secretName);
    },
    [deleteSecret],
  );

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

      <EncryptionWarning />

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
      {newSecretName && !isSecretNameValid(newSecretName) && (
        <Text danger small>
          {SECRET_NAME_INVALID_MESSAGE}
        </Text>
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
                      navigator.clipboard.writeText(`{{ mage_secret_var(${newSecretName}) }}`)
                        .then(() => {
                          toast.success('Successfully copied to clipboard.', {
                            position: toast.POSITION.BOTTOM_RIGHT,
                            toastId: newSecretName,
                          });
                        })
                        .catch(() => {
                          toast.error('Failed to copy to clipboard.', {
                            position: toast.POSITION.BOTTOM_RIGHT,
                            toastId: 'copy_error',
                          });
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
                    danger={newSecretName && !isSecretNameValid(newSecretName)}
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
          {SECRETS_INFO}
        </Text>
      </Spacing>

      <UsageExamples width={tableWidth} />
    </Spacing>
  );
}

export default Secrets;
