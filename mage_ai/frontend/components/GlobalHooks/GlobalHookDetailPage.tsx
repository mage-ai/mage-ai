import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import GlobalHookDetail from '@components/GlobalHooks/GlobalHookDetail';
import Spacing from '@oracle/elements/Spacing';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import {
  camelCaseToNormalWithSpaces,
  capitalizeRemoveUnderscoreLower,
} from '@utils/string';

type GlobalHookDetailPageProps = {
  operationType: string;
  resourceType: string;
  rootProject?: boolean;
  slug: string;
};

function GlobalHookDetailPage({
  operationType,
  resourceType,
  rootProject,
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
          label: () => rootProject ? 'Platform global hooks' : 'Global hooks',
          linkProps: {
            href: `/${rootProject ? 'platform/' : ''}global-hooks`,
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
        rootProject={rootProject}
        uuid={slug}
      />
    </Dashboard>
  );
}

export default GlobalHookDetailPage;
