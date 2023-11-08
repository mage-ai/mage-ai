import { toast } from 'react-toastify';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';

import BasePage from '@components/BasePage';
import api from '@api';
import { LOCAL_STORAGE_KEY_OAUTH_STATE, get } from '@storage/localStorage';
import { queryFromUrl } from '@utils/url';

function OauthPage() {
  const router = useRouter();
  const query = queryFromUrl();

  const provider = query?.provider;

  const { data: dataOauth } = api.oauths.detail(provider, query);
  const oauthUrl = useMemo(() => dataOauth?.oauth?.url, [dataOauth]);

  useEffect(() => {
    const state = query?.state;
    const localState = get(LOCAL_STORAGE_KEY_OAUTH_STATE);
    if (oauthUrl && state === localState) {
      // console.log('oauth url:', oauthUrl);
      router.push(oauthUrl);
    } else if (state !== localState) {
      toast.error(
        'Oauth failed due to state not matching!',
        {
          position: toast.POSITION.BOTTOM_RIGHT,
          toastId: 'oauth-state-error',
        },
      );
    }
  }, [oauthUrl, router, query]);
  

  return (
    <BasePage title="Oauth">
      <></>
    </BasePage>
  );
}

OauthPage.getInitialProps = async () => ({});

export default OauthPage;
