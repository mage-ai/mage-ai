import React, { useMemo } from 'react';
import { useRouter } from 'next/router';

import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import api from '@api';
import { GoogleIcon } from '@oracle/icons';
import { OauthProviderEnum } from '@interfaces/OauthType';
import { UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';
import { set } from '@storage/localStorage';


function GoogleSignIn() {
  const router = useRouter();
  const { data: dataOauthGoogle } = api.oauths.detail(OauthProviderEnum.GOOGLE, {
    redirect_uri: typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '',
  });
  const {
    url: googleOauthUrl,
    redirect_query_params: redirectQueryParams = {},
  } = useMemo(() => dataOauthGoogle?.oauth || {}, [dataOauthGoogle]);

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
