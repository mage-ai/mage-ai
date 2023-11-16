import React, { useMemo } from 'react';
import { useRouter } from 'next/router';

import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import { MicrosoftIcon } from '@oracle/icons';
import { SignInProps } from './constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';
import { set } from '@storage/localStorage';

type MicrosoftSignInProps = {} & SignInProps;

function MicrosoftSignIn({
  oauthResponse,
}: MicrosoftSignInProps) {
  const router = useRouter();
  const {
    url,
    redirect_query_params: redirectQueryParams = {},
  } = useMemo(() => oauthResponse || {}, [oauthResponse]);

  return (
    <>
      {url && (
        <KeyboardShortcutButton
          beforeElement={<MicrosoftIcon size={UNIT * 2} />}
          bold
          inline
          onClick={() => {
            const q = queryFromUrl(url);
            const state = q.state;
            if (redirectQueryParams) {
              set(state, redirectQueryParams);
            }
            router.push(url);
          }}
          uuid="SignForm/active_directory"
        >
          Sign in with Microsoft
        </KeyboardShortcutButton>
      )}
    </>
  );
}

export default MicrosoftSignIn;
