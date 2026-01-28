import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';
import SecretType from '@interfaces/SecretType';
import CodeBlock from '@oracle/components/CodeBlock';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Button from '@oracle/elements/Button';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_META,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import useConfirmLeave from '@utils/hooks/useConfirmLeave';
import { SAMPLE_SECRET_VALUE, SECRET_IN_CODE } from './constants';
import { ButtonsStyle, ContainerStyle } from './index.style';

type SecretDetailProps = {
  onClose: () => void;
  onSaveSuccess?: (secret: SecretType) => void;
};

function SecretDetail({
  onClose,
  onSaveSuccess,
}: SecretDetailProps) {
  const uuid = 'Secrets/SecretDetail';
  const [showError] = useError(null, {}, [], {
    uuid,
  });

  const [touched, setTouched] = useState<boolean>(false);
  const [secretAttributes, setSecretAttributesState] =
    useState<SecretType>();
  const setSecretAttributes = useCallback((handlePrevious) => {
    setTouched(true);
    setSecretAttributesState(handlePrevious);
  }, []);

  const [createSecret, { isLoading: isLoadingCreateSecret }] = useMutation(
    api.secrets.useCreate(),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: (res) => {
            onSaveSuccess?.(res?.secret);
            onClose();
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        }),
    },
  );

  const isNameValid = useMemo(() => {
    const name = secretAttributes?.name || '';
    // Only allow alphanumeric and underscores, must start with a letter/underscore
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }, [secretAttributes?.name]);

  const buttonDisabled = useMemo(() => !secretAttributes?.name?.trim()
    || !isNameValid
    || !secretAttributes?.value?.trim(), [
    secretAttributes,
    isNameValid,
  ]);

  const saveSecret = useCallback(() => {
    // @ts-ignore
    createSecret({
      secret: secretAttributes,
    });
  }, [
    createSecret,
    secretAttributes,
  ]);

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuid);
  }, [unregisterOnKeyDown, uuid]);

  registerOnKeyDown(
    uuid,
    (event, keyMapping) => {
      if (touched && onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping)) {
        event.preventDefault();
        const warning = 'You have changes that are unsaved. Click cancel and save your changes before reloading page.';
        if (typeof window !== 'undefined' && typeof location !== 'undefined' && window.confirm(warning)) {
          location.reload();
        }
      } else if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)
        || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_S], keyMapping)
      ) {
        event.preventDefault();
        saveSecret();
      }
    },
    [
      saveSecret,
      touched,
    ],
  );

  const { ConfirmLeaveModal } = useConfirmLeave({
    shouldWarn: touched,
    warningMessage: 'You have unsaved changes. Are you sure you want to leave?',
  });

  return (
    <ContainerStyle>
      <ConfirmLeaveModal />
      <FlexContainer
        flexDirection="column"
        fullHeight
        justifyContent="space-between"
      >
        <Flex flexDirection="column">
          <Spacing mt={2} px={PADDING_UNITS}>
            <Spacing mb={2}>
              <Text muted small>
                <Text inline warning>
                  WARNING:
                </Text>{' '}
                The encryption key is stored in a file on your machine. If you need more secure
                encryption, we recommend using a secrets manager.
              </Text>
            </Spacing>

            <Spacing>
              <Text muted small>
                Secrets are not editable, they can only be created and deleted. Secrets are shared across
                the project, and can be used in configuration fields.
              </Text>
            </Spacing>
          </Spacing>

          <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>
                Secret Name
              </Text>
              <Text muted small>
                A human readable name for your secret.
              </Text>
              {secretAttributes?.name && !isNameValid && (
                <Text danger small>
                  Name must start with a letter or underscore and contain only letters, numbers, and underscores.
                </Text>
              )}
            </Spacing>

            <TextInput
              danger={!isNameValid}
              monospace
              onChange={(e) => setSecretAttributes((prev) => ({
                ...prev,
                name: e.target.value,
              }))}
              placeholder="e.g. some_secret_name"
              primary
              setContentOnMount
              value={secretAttributes?.name || ''}
            />
          </Spacing>

          <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
            <Spacing mb={1}>
              <Text bold>
                Secret Value
              </Text>
              <Text muted small>
                The value for your secret. This will be encrypted.
              </Text>
            </Spacing>

            <TextInput
              monospace
              onChange={e => setSecretAttributes(prev => ({
                  ...prev,
                  value: e.target.value,
              }))}
              placeholder="e.g. some_secret_value"
              primary
              setContentOnMount
              value={secretAttributes?.value || ''}
            />
          </Spacing>

          <Spacing mt={2} px={PADDING_UNITS}>
            <Spacing mb={2}>
              <Text muted small>To reference a secret, use the
                following templating syntax:
              </Text>
            </Spacing>

            <Spacing mb={2}>
              <CodeBlock
                language="yaml"
                small
                source={SAMPLE_SECRET_VALUE}
              />
            </Spacing>

            <Spacing mb={2}>
              <Text muted small>
                To reference a secret in code, you can import the `get_secret_value` helper method:
              </Text>
            </Spacing>

            <Spacing mb={PADDING_UNITS}>
              <CodeBlock
                language="python"
                small
                source={SECRET_IN_CODE}
              />
            </Spacing>
          </Spacing>
        </Flex>

        <ButtonsStyle>
          <Spacing p={PADDING_UNITS}>
            <FlexContainer>
              <Button
                disabled={buttonDisabled}
                fullWidth
                loading={isLoadingCreateSecret}
                onClick={() => saveSecret()}
                primary
              >
                Create new secret
              </Button>

              <Spacing mr={1} />

              <Button
                onClick={onClose}
                secondary
              >
                Cancel
              </Button>
            </FlexContainer>
          </Spacing>
        </ButtonsStyle>
      </FlexContainer>
    </ContainerStyle>
  );
}

export default SecretDetail;
