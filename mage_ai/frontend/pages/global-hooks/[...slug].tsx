import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import GlobalHookDetail from '@components/GlobalHooks/GlobalHookDetail';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  camelCaseToNormalWithSpaces,
  capitalizeRemoveUnderscoreLower,
} from '@utils/string';

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
  const label = useMemo(() => {
    const text = [
      slug,
      resourceType ? camelCaseToNormalWithSpaces(resourceType) : resourceType,
      operationType ? capitalizeRemoveUnderscoreLower(operationType) : operationType,
    ].filter(s => s?.length >= 1).join(' ');
    if (text?.length >= 40) {
      return `${text?.slice(0, 40)}...`;
    }

    return text;
  }, [
    operationType,
    resourceType,
    slug,
  ]);

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
      <GlobalHookDetail
        operationType={operationType}
        resourceType={resourceType}
        uuid={slug}
      />
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
