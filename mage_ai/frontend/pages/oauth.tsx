import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import BasePage from '@components/BasePage';
import ClickOutside from '@oracle/components/ClickOutside';
import ErrorPopup from '@components/ErrorPopup';
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

  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (oauthUrl) {
      const oauthQuery = queryFromUrl(oauthUrl);
      const { error } = oauthQuery || {};
      if (error) {
        setErrorMessage(error);
      } else if (localState) {
        remove(state);
        router.push(oauthUrl);
      } else if (!localState) {
        setErrorMessage('Oauth failed due to state not matching!');
      }
    }
  }, [localState, oauthUrl, router, query, state]);
  

  return (
    <BasePage title="Oauth">
      <></>

      {errorMessage && (
        <ClickOutside
          disableClickOutside
          isOpen
          onClickOutside={() => setErrorMessage?.(null)}
        >
          <ErrorPopup
            displayMessage={errorMessage}
            onClose={() => setErrorMessage?.(null)}
          />
        </ClickOutside>
      )}
    </BasePage>
  );
}

OauthPage.getInitialProps = async () => ({});

export default OauthPage;
