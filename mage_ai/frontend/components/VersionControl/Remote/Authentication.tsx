import React, { useMemo } from 'react';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Button from '@oracle/elements/Button';
import Headline from '@oracle/elements/Headline';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import { GitHubIcon } from '@oracle/icons';
import { UNIT, UNITS_BETWEEN_ITEMS_IN_SECTIONS, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import api from '@api';
import OauthType, { OauthProviderEnum } from '@interfaces/OauthType';
import { onSuccess } from '@api/utils/response';
import { queryFromUrl } from '@utils/url';
import { set } from '@storage/localStorage';
import { useRouter } from 'next/router';
import GitBranchType from '@interfaces/GitBranchType';
import { useMutation } from 'react-query';

type ProviderProps = {
  isLoadingCreateOauth: boolean;
  oauth: OauthType;
  provider: OauthProviderEnum;
  showError: (opts: any) => void;
};

type AuthenticationProps = {
  branch: GitBranchType;
  isLoadingCreateOauth: boolean;
  showError: (opts: any) => void;
};

function Provider({
  isLoadingCreateOauth,
  oauth,
  provider,
  showError,
}: ProviderProps) {
  const router = useRouter();

  const [updateOauth, { isLoading: isLoadingUpdateOauth }] = useMutation(
    api.oauths.useUpdate(provider),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => window.location.href = window.location.href.split('?')[0],
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  return (
    <FlexContainer justifyContent="space-between">
      <Flex>
        <GitHubIcon size={UNIT * 2} />
        <Spacing mr={1} />
        <Text bold>
          {provider}
        </Text>
      </Flex>
      <Flex>
        {oauth?.authenticated ? (
          <Button
            loading={isLoadingUpdateOauth}
            // @ts-ignore
            onClick={() => updateOauth({
              oauth: {
                action_type: 'reset',
              },
            })}
            warning
          >
            Reset
          </Button>
        ) : (
          <Button
            loading={isLoadingCreateOauth}
            onClick={() => {
              const url = oauth?.url;
              const q = queryFromUrl(url);
              const state = q.state;
              set(state, oauth?.redirect_query_params || {});
              router.push(url);
            }}
            primary
          >
            Authenticate
          </Button>
        )}
      </Flex>
    </FlexContainer>
  );
}

function Authentication({
  branch,
  isLoadingCreateOauth,
  showError,
}: AuthenticationProps) {
  const { data: dataOauths, mutate: fetchOauths } = api.oauths.list({
    type: 'git',
    redirect_uri: typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '',
  });

  const { data: dataGitHubOauth, mutate: fetchGitHubOauth } = api.oauths.detail(OauthProviderEnum.GITHUB, {
    redirect_uri: typeof window !== 'undefined' ? encodeURIComponent(window.location.href) : '',
  });
  const oauthGitHub = useMemo(() => dataGitHubOauth?.oauth || {}, [dataGitHubOauth]);

  const accessTokenExists = useMemo(() => branch?.access_token_exists, [branch]);

  const providerMapping = useMemo(() => {
    const mapping = dataOauths?.oauths?.reduce(
      (acc, curr) => {
        acc[curr.provider] = curr;
        return acc;
      },
      {},
    ) || {};
    mapping[OauthProviderEnum.GITHUB] = oauthGitHub;
    return mapping;
  }, [
    dataOauths,
    oauthGitHub,
  ]);

  return (
    <>
      <Headline>
        Authentication
      </Headline>

      <Spacing mt={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
        {accessTokenExists && (
          <Spacing mb={2}>
            <Button
              disabled
            >
              Using access token from Git Settings
            </Button>
            <Spacing mt={1}>
              <Text muted>
                Some features may not work unless you authenticate with GitHub.
              </Text>
            </Spacing>
          </Spacing>
        )}

        <Spacing mb={UNITS_BETWEEN_SECTIONS}>
          <Text muted>
            Authenticating with the apps below will allow you to easily pull, push, and create
            pull requests.
          </Text>
          <Spacing mb={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            {[OauthProviderEnum.GITHUB, OauthProviderEnum.BITBUCKET].map(provider => (
              <Provider
                isLoadingCreateOauth={isLoadingCreateOauth}
                key={provider}
                oauth={providerMapping?.[provider]}
                provider={provider}
                showError={showError}
              />
            ))}
          </Spacing>
        </Spacing>
      </Spacing>
    </>
  );
}

export default Authentication;
