import { toast } from 'react-toastify';
import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';

import BasePage from '@components/BasePage';
import api from '@api';
import { get, remove } from '@storage/localStorage';
import { queryFromUrl } from '@utils/url';

function OauthPage() {
  const router = useRouter();
  const query = queryFromUrl();

  const state = query?.state;
  const localState = get(state);
  const provider = localState?.provider;

  let newQuery = query;
  if (localState) {
    newQuery = {
      ...query,
      ...localState,
    };
  }

  const { data: dataOauth } = api.oauths.detail(provider, newQuery);
  const oauthUrl = useMemo(() => dataOauth?.oauth?.url, [dataOauth]);

  useEffect(() => {
    if (oauthUrl) {
      if (localState) {
        remove(state);
        router.push(oauthUrl);
      } else if (!localState) {
        toast.error(
          'Oauth failed due to state not matching!',
          {
            position: toast.POSITION.BOTTOM_RIGHT,
            toastId: 'oauth-state-error',
          },
        );
      }
    }
  }, [localState, oauthUrl, router, query, state]);
  

  return (
    <BasePage title="Oauth">
      <></>
    </BasePage>
  );
}

OauthPage.getInitialProps = async () => ({});

export default OauthPage;
