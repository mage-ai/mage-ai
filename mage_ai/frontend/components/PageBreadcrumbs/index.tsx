import { useRouter } from 'next/router';

import Breadcrumbs from '@oracle/components/Breadcrumbs';

enum PageEnum {
  DATASETS = 'datasets',
  DATASET_DETAIL = 'dataset_detail',
  COLUMNS = 'features',
  COLUMN_DETAIL = 'feature_detail',
}

type PageBreadcrumbsProps = {
  featureSets: any[];
  featureSet: any;
  page: PageEnum;
};

function PageBreadcrumbs({
  featureSets,
  featureSet,
  page,
}: PageBreadcrumbsProps) {
  const router = useRouter();
  const { pathname } = router || {};
  const breadcrumbs = pathname?.split('/').slice(1) || [];

  return (
    <Breadcrumbs
      breadcrumbs={breadcrumbs}
    />
  );
}

export default PageBreadcrumbs;
