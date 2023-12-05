import React, { useMemo } from 'react';
import { useRouter } from 'next/router';

import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import { GoogleIcon } from '@oracle/icons';
import { SignInProps } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';
import { set } from '@storage/localStorage';

type GoogleSignInProps = {} & SignInProps;

function GoogleSignIn({
  oauthResponse,
}: GoogleSignInProps) {
  const router = useRouter();
  const {
    url: googleOauthUrl,
    redirect_query_params: redirectQueryParams = {},
  } = useMemo(() => oauthResponse || {}, [oauthResponse]);

  return (
    <>
      {googleOauthUrl && (
        <KeyboardShortcutButton
          beforeElement={<GoogleIcon size={UNIT * 2} />}
          bold
          inline
          onClick={() => {
            const q = queryFromUrl(googleOauthUrl);
            const state = q.state;
            set(state, redirectQueryParams);
            router.push(googleOauthUrl);
          }}
          uuid="SignForm/google"
        >
          Sign in with Google
        </KeyboardShortcutButton>
      )}
    </>
  );
}

export default GoogleSignIn;
