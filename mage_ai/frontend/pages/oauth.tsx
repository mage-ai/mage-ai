import BasePage from '@components/BasePage';
import { toast } from 'react-toastify';
import SignForm from '@components/Sessions/SignForm';
import { queryFromUrl } from '@utils/url';
import api from '@api';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { get, set } from '@storage/localStorage';

function OauthPage() {
  const router = useRouter();
  const query = queryFromUrl();

  const provider = query?.provider;

  const { data: dataOauth } = api.oauths.detail(provider, query);
  const oauthUrl = useMemo(() => dataOauth?.oauth?.url, [dataOauth]);

  useEffect(() => {
    const state = query?.state;
    const localState = get('oauth_state');
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
