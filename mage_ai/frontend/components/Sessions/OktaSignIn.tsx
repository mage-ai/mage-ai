import React, { useMemo } from 'react';

import api from '@api';
import { OauthProviderEnum } from '@interfaces/OauthType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import { GoogleIcon } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { useRouter } from 'next/router';
import { set } from '@storage/localStorage';
import { queryFromUrl } from '@utils/url';


function OktaSignIn() {
  const router = useRouter();
  const { data } = api.oauths.detail(OauthProviderEnum.OKTA, {
    redirect_uri: typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '',
  });
  const {
    url: oauthUrl,
    redirect_query_params: redirectQueryParams = {},
  } = useMemo(() => data?.oauth || {}, [data]);

  console.log('oauth url', oauthUrl);

  return (
    <>
      {oauthUrl && (
        <KeyboardShortcutButton
          beforeElement={<GoogleIcon size={UNIT * 2} />}
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
