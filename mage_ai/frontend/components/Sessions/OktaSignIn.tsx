import React, { useMemo } from 'react';
import { useRouter } from 'next/router';

import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import api from '@api';
import { OauthProviderEnum } from '@interfaces/OauthType';
import { queryFromUrl } from '@utils/url';
import { set } from '@storage/localStorage';


function OktaSignIn() {
  const router = useRouter();
  const { data } = api.oauths.detail(OauthProviderEnum.OKTA, {
    redirect_uri: typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '',
  });
  const {
    url: oauthUrl,
    redirect_query_params: redirectQueryParams = {},
  } = useMemo(() => data?.oauth || {}, [data]);

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
          uuid="SignForm/okta"
        >
          Sign in with Okta
        </KeyboardShortcutButton>
      )}
    </>
  );
}

export default OktaSignIn;
