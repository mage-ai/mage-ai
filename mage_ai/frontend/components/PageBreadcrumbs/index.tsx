import { useRouter } from 'next/router';

import Breadcrumbs from '@oracle/components/Breadcrumbs';
import { BreadcrumbType } from '@oracle/components/Breadcrumbs/Breadcrumb';
import { getFeatureUUID } from '@utils/models/featureSet';

enum PageEnum {
  DATASETS = 'datasets',
  DATASET_DETAIL = 'dataset_detail',
  COLUMNS = 'features',
  COLUMN_DETAIL = 'feature_detail',
}

type PageBreadcrumbsProps = {
  featureSet: any;
};

const MAX_CHARS = 35;

function PageBreadcrumbs({
  featureSet,
}: PageBreadcrumbsProps) {
  const router = useRouter();
  const { pathname } = router || {};
  const { slug, column } = router.query;
  const pathParts = pathname?.split('/').slice(1) || [];

  const datasetName = featureSet?.metadata?.name || 'dataset';
  let breadcrumbs: BreadcrumbType[] = [];

  if (pathParts.length > 0) {
    breadcrumbs = pathParts.map((part, idx) => {
      let label: PageEnum | string = PageEnum.DATASETS;
      let href = `/${PageEnum.DATASETS}`;
      if (idx === 1) {
        label = datasetName.length > MAX_CHARS
          ? `${datasetName.slice(0, MAX_CHARS)}...`
          : datasetName;
        href = `/${PageEnum.DATASETS}/${slug}`;
      } else if (idx === 2) {
        label = 'columns';
        href = `/${PageEnum.DATASETS}/${slug}/${PageEnum.COLUMNS}`;
      } else if (idx === 3) {
        const featureIndex = +column;
        const featureUUID = getFeatureUUID(featureSet, featureIndex);
        label = featureUUID && featureUUID.length > MAX_CHARS
          ? `${featureUUID.slice(0, MAX_CHARS)}...`
          : featureUUID;
        href = `/${PageEnum.DATASETS}/${slug}/${PageEnum.COLUMNS}/${column}`;
      }

      const breadcrumb: BreadcrumbType = {
        bold: true,
        href,
        label,
      };
      if (idx === pathParts.length - 1) {
        breadcrumb.selected = true;
        breadcrumb.href = null;
      }

      return breadcrumb;
    });
  }

  return (
    <Breadcrumbs
      breadcrumbs={breadcrumbs}
      large
      linkProps={{
        noHoverUnderline: true,
      }}
    />
  );
}

export default PageBreadcrumbs;
