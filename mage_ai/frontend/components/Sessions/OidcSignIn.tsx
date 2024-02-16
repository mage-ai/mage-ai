import React, { useMemo } from 'react';
import { useRouter } from 'next/router';

import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import { SignInProps } from './constants';
import { queryFromUrl } from '@utils/url';
import { set } from '@storage/localStorage';

type OidcSignInProps = {} & SignInProps;

function OidcSignIn({
  oauthResponse,
}: OidcSignInProps) {
  const router = useRouter();
  const {
    url: oauthUrl,
    redirect_query_params: redirectQueryParams = {},
  } = useMemo(() => oauthResponse || {}, [oauthResponse]);

  return (
    <>
      {oauthUrl && (
        <KeyboardShortcutButton
          bold
          inline
          onClick={() => {
            const q = queryFromUrl(oauthUrl);
            const state = q.state;
            set(state, redirectQueryParams);
            router.push(oauthUrl);
          }}
          uuid="SignForm/oidc_generic"
        >
          Sign in with OIDC
        </KeyboardShortcutButton>
      )}
    </>
  );
}

export default OidcSignIn;
