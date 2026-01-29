import { useState } from 'react';
import { useMutation } from 'react-query';
import { toast } from 'react-toastify';

import api from '@api';
import { onSuccess } from '@api/utils/response';
import Table from '@components/shared/Table';
import { useError } from '@context/Error';
import SecretType from '@interfaces/SecretType';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import PopupMenu from '@oracle/components/PopupMenu';
import Spinner from '@oracle/components/Spinner';
import Tooltip from '@oracle/components/Tooltip';
import Button from '@oracle/elements/Button';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { Copy, Trash } from '@oracle/icons';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

type SecretsProps = {
  fetchSecrets: () => void;
  isLoading: boolean;
  secrets: SecretType[];
};

function Secrets({
  fetchSecrets,
  isLoading,
  secrets,
}: SecretsProps) {
  const [secretToDelete, setSecretToDelete] = useState<string | null>(null);
  const [showError] = useError(null, {}, [], {
    uuid: 'Secrets/index',
  });

  const [deleteSecret] = useMutation(
    (name: string) => api.secrets.useDelete(name)(),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: () => {
            fetchSecrets();
            toast.success('Secret successfully deleted', {
              position: toast.POSITION.BOTTOM_RIGHT,
            });
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        }),
    },
  );

  const sharedButtonProps = {
    borderRadius: `${BORDER_RADIUS_SMALL}px`,
    iconOnly: true,
    noBackground: true,
    noBorder: true,
    outline: true,
    padding: '4px',
  };

  if (isLoading) {
    return (
      <FlexContainer alignItems="center" fullHeight justifyContent="center">
        <Spinner large />
      </FlexContainer>
    );
  }

  if (secrets?.length === 0) {
    return (
      <Spacing p={PADDING_UNITS}>
        <Text>There are currently no secrets registered.</Text>
      </Spacing>
    );
  }

  return (
    <>
      <Table
        columnFlex={[null, null, null]}
        columns={[
          {
            uuid: 'Name',
          },
          {
            uuid: 'Value',
          },
          {
            center: true,
            label: () => '',
            uuid: 'Actions',
          },
        ]}
        rows={secrets?.map((secret: SecretType) => [
          <Text key={`name_${secret.name}`} monospace>
            {secret.name}
          </Text>,
          <Text default key={`value_${secret.name}`} monospace>
            ****************
          </Text>,
          <Flex
            flex={1}
            justifyContent="flex-end"
            key={`actions_${secret.name}`}
          >
            <Tooltip
              appearBefore
              label="Copy secret name"
              widthFitContent
            >
              <Button
                {...sharedButtonProps}
                onClick={() => {
                  navigator.clipboard.writeText(secret.name)
                    .then(() => {
                        toast.success('Successfully copied to clipboard.', {
                            position: toast.POSITION.BOTTOM_RIGHT,
                            toastId: secret.name,
                        });
                    })
                    .catch(() => {
                        toast.error('Failed to copy to clipboard.', {
                            position: toast.POSITION.BOTTOM_RIGHT,
                            toastId: 'copy_error',
                        });
                    });
                }}
                title="Copy secret name"
              >
                <Copy default size={2 * UNIT} />
              </Button>
            </Tooltip>
            <Spacing ml={`${UNIT * 2}px`}>
              <Tooltip
                appearBefore
                label={`Delete ${secret.name} secret`}
                widthFitContent
              >
                <Button
                  {...sharedButtonProps}
                  onClick={() => {
                    setSecretToDelete(secret.name);
                  }}
                  title="Delete"
                >
                  <Trash default size={2 * UNIT} />
                </Button>
              </Tooltip>
            </Spacing>
          </Flex>,
        ])}
        uuid="secrets"
      />
      {secretToDelete && (
        <ClickOutside
          onClickOutside={() => setSecretToDelete(null)}
          open
        >
          <PopupMenu
            centerOnScreen
            danger
            onCancel={() => setSecretToDelete(null)}
            onClick={() => {
              deleteSecret(secretToDelete);
              setSecretToDelete(null);
            }}
            subtitle={
              'This is irreversible and will immediately delete the secret. ' +
              'Please be sure to update all code blocks that use this secret before deleting.'
            }
            title={`Are you sure you want to delete the secret ${secretToDelete}?`}
            width={UNIT * 40}
          />
        </ClickOutside>
      )}
    </>
  );
}

export default Secrets;
