import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';

import AuthToken from '@api/utils/AuthToken';
import api from '@api';
import { isDemo } from '@utils/environment';
import { logUserOS } from '@utils/gtag';

const PATHS_TO_IGNORE_AUTH_CHECK = [
  '/sign-in',
  '/oauth',
];

const Home = () => {
  const router = useRouter();
  const completePath = router.asPath;
  const basePath = completePath.split('?')[0];

  const { data: data } = api.statuses.list();
  const dataStatus = useMemo(() => data?.statuses?.[0], [data]);

  const { data: dataPipelineRuns } = api.pipeline_runs.list({ _limit: 0 });
  const pipelineRunCount = useMemo(() => dataPipelineRuns?.metadata?.count || 0, [
    dataPipelineRuns?.metadata?.count,
  ]);
  const homepageRedirectPath = pipelineRunCount === 0 ? '/pipelines' : '/overview';

  useEffect(() => {
    if (isDemo()) {
      logUserOS();
    }
  }, []);

  useEffect(() => {
    if (PATHS_TO_IGNORE_AUTH_CHECK.includes(basePath)) {
      router.replace(completePath);
    } else if (dataStatus) {
      const requireUserAuthentication = dataStatus?.require_user_authentication;
      const loggedIn = AuthToken.isLoggedIn();
      if (requireUserAuthentication && !loggedIn) {
        router.replace('/sign-in');
      } else {
        const manage = dataStatus?.is_instance_manager;
        let pathname = completePath;
        if (basePath === '/') {
          pathname = manage ? '/manage' : homepageRedirectPath;
        }
        if (dataPipelineRuns) {
          router.replace(pathname);
        }
      }
    }
  }, [
    basePath,
    completePath,
    dataPipelineRuns,
    dataStatus,
    homepageRedirectPath,
    router,
  ]);
};

export default Home;
