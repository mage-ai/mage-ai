import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import GlobalHookDetail from '@components/GlobalHooks/GlobalHookDetail';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type GlobalHookDetailPageProps = {
  operationType: string;
  resourceType: string;
  slug: string;
};

function GlobalHookDetailPage({
  operationType,
  resourceType,
  slug,
}: GlobalHookDetailPageProps) {
  const { data: dataPipelines } = api.pipelines.list();
  const { data: dataGlobalHook } = api.global_hooks.detail(slug, {
    include_operation_types: 1,
    include_resource_types: 1,
    operation_type: operationType,
    resource_type: resourceType,
  });

  const globalHook =  useMemo(() => dataGlobalHook?.global_hook, [
    dataGlobalHook,
  ]);
  const pipelines = useMemo(() => dataPipelines?.pipelines || [], [dataPipelines]);

  const label = useMemo(() => {
    if (slug?.length >= 21) {
      return `${slug?.slice(0, 21)}...`;
    }

    return slug;
  }, [slug]);

  return (
    <Dashboard
      addProjectBreadcrumbToCustomBreadcrumbs
      breadcrumbs={[
        {
          label: () => 'Global hooks',
          linkProps: {
            href: '/global-hooks',
          },
        },
        {
          bold: true,
          label: () => label,
        },
      ]}
      title={slug}
      uuid="GlobalHookDetail/index"
    >
      {!dataGlobalHook && (
        <Spacing p={PADDING_UNITS}>
          <Spinner inverted />
        </Spacing>
      )}
      {globalHook && (
        <GlobalHookDetail
          globalHook={globalHook}
          pipelines={pipelines}
        />
      )}
    </Dashboard>
  );
}

GlobalHookDetailPage.getInitialProps = async (ctx) => {
  const {
    operation_type: operationType,
    resource_type: resourceType,
    slug,
  }: {
    operation_type: string;
    resource_type: string;
    slug: string[],
  } = ctx.query;

  console.log(ctx.query)

  return {
    operationType,
    resourceType,
    slug: slug?.[0],
  };
};

export default PrivateRoute(GlobalHookDetailPage);
