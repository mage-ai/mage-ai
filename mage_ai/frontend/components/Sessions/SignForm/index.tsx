import { useMutation } from 'react-query';
import { useRouter } from 'next/router';
import { useState } from 'react';

import ApiErrorType from '@interfaces/ApiErrorType';
import AuthToken from '@api/utils/AuthToken';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { ContainerStyle } from './index.style';
import {
  KEY_CODE_ENTER,
  KEY_SYMBOL_ENTER,
} from '@utils/hooks/keyboardShortcuts/constants';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { queryFromUrl } from '@utils/url';
import { setUser } from '@utils/session';

const KEY_EMAIL = 'email';
const KEY_PASSWORD = 'password';

type SignFormProps = {
  title: string;
};

function SignForm({
  title,
}: SignFormProps) {
  const router = useRouter();

  const [error, setError] = useState<ApiErrorType>(null);
  const [payload, setPayload] = useState<{
    [KEY_EMAIL]: string;
    [KEY_PASSWORD]: string;
  }>({});

  const [create, { isLoading }] = useMutation(
    api.sessions.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            session: {
              token,
              user,
            },
          }) => {
            setUser(user);
            AuthToken.storeToken(token, () => {
            let url: string = '/pipelines';
            if (typeof window !== 'undefined' && queryFromUrl(window.location.href).redirect_url) {
              url = queryFromUrl(window.location.href).redirect_url;
            }
              router.push(url);
            });
          },
          onErrorCallback: ({ error }) => {
            setError(error);
          },
        },
      ),
    },
  );

  return (
    <ContainerStyle>
      <Headline yellow>
        {title}
      </Headline>

      <form>
        <Spacing mt={3}>
          <TextInput
            autoComplete="username"
            label="Email"
            large
            meta={{
              error: ' ',
              touched: !!error,
            }}
            onChange={e => setPayload(prev => ({
              ...prev,
              [KEY_EMAIL]: e.target.value,
            }))}
            primary={!error}
            value={payload[KEY_EMAIL]}
          />

          <Spacing mt={2}>
            <TextInput
              autoComplete="current-password"
              label="Password"
              large
              meta={{
                error: ' ',
                touched: !!error,
              }}
              onChange={e => setPayload(prev => ({
                ...prev,
                [KEY_PASSWORD]: e.target.value,
              }))}
              primary={!error}
              type="password"
              value={payload[KEY_PASSWORD]}
            />
          </Spacing>
        </Spacing>

        {error && (
          <Spacing mt={2}>
            <Text danger>
              {error.message}
            </Text>
          </Spacing>
        )}

        <Spacing mt={3}>
          <KeyboardShortcutButton
            bold
            inline
            keyTextGroups={[[KEY_SYMBOL_ENTER]]}
            keyboardShortcutValidation={({
              keyMapping,
            }) => onlyKeysPresent([KEY_CODE_ENTER], keyMapping)}
            large
            loading={isLoading}
            noHoverUnderline
            // @ts-ignore
            onClick={() => create({
              session: payload,
            })}
            selected
            uuid="SignForm/action"
            wind
          >
            Sign into Mage
          </KeyboardShortcutButton>
        </Spacing>
      </form>
    </ContainerStyle>
  );
}

export default SignForm;
