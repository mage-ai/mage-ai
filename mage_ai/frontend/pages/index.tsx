import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';

import AuthToken from '@api/utils/AuthToken';
import api from '@api';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';
import { isDemo } from '@utils/environment';
import { logUserOS } from '@utils/gtag';

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
    const loggedIn = AuthToken.isLoggedIn();
    if (REQUIRE_USER_AUTHENTICATION() && !loggedIn) {
      router.replace('/sign-in');
    } else if (dataStatus) {
      const manage = dataStatus?.is_instance_manager;
      let pathname = completePath;
      if (basePath === '/') {
        pathname = manage ? '/manage' : homepageRedirectPath;
      }
      if (dataPipelineRuns) {
        router.replace(pathname);
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
