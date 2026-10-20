import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import GlobalDataProductDetail from '@components/GlobalDataProductDetail';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type TemplateDetailsProps = {
  project?: string;
  slug: string;
};

function GlobalDataProductDetailPage({ project, slug }: TemplateDetailsProps) {
  const { data: dataGlobalDataProduct } = api.global_data_products.detail(
    slug,
    project ? { project } : {},
  );
  const globalDataProduct = useMemo(
    () => dataGlobalDataProduct?.global_data_product,
    [dataGlobalDataProduct],
  );

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
          label: () => 'Global data products',
          linkProps: {
            href: '/global-data-products',
          },
        },
        {
          bold: true,
          label: () => label,
        },
      ]}
      title={slug}
      uuid="GlobalDataProductDetail/index"
    >
      {!dataGlobalDataProduct && (
        <Spacing p={PADDING_UNITS}>
          <Spinner inverted />
        </Spacing>
      )}
      {globalDataProduct && <GlobalDataProductDetail globalDataProduct={globalDataProduct} />}
    </Dashboard>
  );
}

GlobalDataProductDetailPage.getInitialProps = async ctx => {
  const {
    slug: slugProp,
  }: {
    slug: string[];
  } = ctx.query;
  const slug = slugProp?.[slugProp?.length - 1];
  const project = slugProp?.length >= 2 ? slugProp?.[0] : null;
  return {
    project,
    slug,
  };
};

export default PrivateRoute(GlobalDataProductDetailPage);
