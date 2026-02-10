import {
  useCallback,
  useMemo,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import api from '@api';
import { onSuccess } from '@api/utils/response';
import { useError } from '@context/Error';
import SecretType from '@interfaces/SecretType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Button from '@oracle/elements/Button';
import TextInput from '@oracle/elements/Inputs/TextInput';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { toast } from 'react-toastify';
import {
  SECRET_NAME_INVALID_MESSAGE,
  SECRETS_INFO,
} from './constants';
import { ButtonsStyle, ContainerStyle } from './index.style';
import { EncryptionWarning, UsageExamples } from './SecretInformation';
import { isSecretNameValid } from './utils';

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

  const [secretAttributes, setSecretAttributes] =
    useState<SecretType>();

  const [createSecret, { isLoading: isLoadingCreateSecret }] = useMutation(
    api.secrets.useCreate(),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: (res) => {
            toast.success('Secret created successfully', {
              position: toast.POSITION.BOTTOM_RIGHT,
              toastId: 'secret_created',
            });
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
    return isSecretNameValid(name);
  }, [secretAttributes?.name]);

  const buttonDisabled = useMemo(() => !isNameValid
    || !secretAttributes?.value, [
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

  return (
    <ContainerStyle>
      <FlexContainer
        flexDirection="column"
        fullHeight
        justifyContent="space-between"
      >
        <Flex flexDirection="column">
          <Spacing mt={2} px={PADDING_UNITS}>
            <EncryptionWarning muted small />

            <Spacing>
              <Text muted small>
                {SECRETS_INFO}
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
                  {SECRET_NAME_INVALID_MESSAGE}
                </Text>
              )}
            </Spacing>

            <TextInput
              danger={secretAttributes?.name && !isNameValid}
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
            <UsageExamples muted small />
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
