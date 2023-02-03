import { useMutation } from 'react-query';
import { useRouter } from 'next/router';
import { useState } from 'react';

import ApiErrorType from '@interfaces/ApiErrorType';
import AuthToken from '@api/utils/AuthToken';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { BackgroundImageStyle, ContainerStyle } from './index.style';
import { Col, Row } from '@components/shared/Grid';
import {
  KEY_CODE_ENTER,
  KEY_SYMBOL_ENTER,
} from '@utils/hooks/keyboardShortcuts/constants';
import { PADDING_HORIZONTAL_UNITS } from '@oracle/styles/units/spacing';
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
    [KEY_EMAIL]?: string;
    [KEY_PASSWORD]?: string;
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
    <Row fullHeight>
      <Col
        lg={6}
        md={12}
      >
        <FlexContainer
          flexDirection="column"
          fullHeight
          fullWidth
          justifyContent="center"
        >
          <Spacing
            px={{
              xl: PADDING_HORIZONTAL_UNITS * 5,
              xs: PADDING_HORIZONTAL_UNITS,
            }}
            py={PADDING_HORIZONTAL_UNITS}
          >
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
          </Spacing>
        </FlexContainer>
      </Col>

      <Col
        hiddenLgDown
        lg={6}
        style={{
          flex: 1,
        }}
      >
        <Spacing
          fullHeight
          fullWidth
          px={PADDING_HORIZONTAL_UNITS}
          py={PADDING_HORIZONTAL_UNITS + 8}
        >
          <BackgroundImageStyle src="/images/sessions/abstract.png">
            Sign in abstract image
          </BackgroundImageStyle>
        </Spacing>
      </Col>
    </Row>
  );
}

export default SignForm;
