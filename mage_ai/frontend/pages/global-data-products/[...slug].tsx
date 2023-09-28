import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import GlobalDataProductDetail from '@components/GlobalDataProductDetail';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import api from '@api';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';

type TemplateDetailsProps = {
  slug: string;
};

function GlobalDataProductDetailPage({
  slug,
}: TemplateDetailsProps) {
  const { data: dataGlobalDataProduct } = api.global_data_products.detail(slug);
  const globalDataProduct =  useMemo(() => dataGlobalDataProduct?.global_data_product, [
    dataGlobalDataProduct,
  ]);

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
      {globalDataProduct && (
        <GlobalDataProductDetail
          globalDataProduct={globalDataProduct}
        />
      )}
    </Dashboard>
  );
}

GlobalDataProductDetailPage.getInitialProps = async (ctx) => {
  const {
    slug,
  }: {
    slug: string[],
  } = ctx.query;

  return {
    slug: slug?.[0],
  };
};

export default PrivateRoute(GlobalDataProductDetailPage);
