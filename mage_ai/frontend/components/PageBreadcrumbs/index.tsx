import { useRouter } from 'next/router';

import Breadcrumbs from '@oracle/components/Breadcrumbs';
import FeatureSetType from '@interfaces/FeatureSetType';
import { BreadcrumbType } from '@oracle/components/Breadcrumbs/Breadcrumb';
import {
  SHOW_COLUMNS_QUERY_PARAM,
  TAB_REPORTS,
  TABS_QUERY_PARAM,
} from 'components/datasets/overview';
import { queryFromUrl } from '@utils/url';

enum PageEnum {
  DATASETS = 'datasets',
  DATASET_DETAIL = 'dataset_detail',
  COLUMNS = 'features',
  COLUMN_DETAIL = 'feature_detail',
}

type PageBreadcrumbsProps = {
  featureSet: FeatureSetType;
};

const MAX_CHARS = 35;

function PageBreadcrumbs({
  featureSet,
}: PageBreadcrumbsProps) {
  const router = useRouter();
  const { slug = [] } = router.query;
  const qFromUrl = queryFromUrl();
  const tab = qFromUrl[TABS_QUERY_PARAM];
  const {
    show_columns: showColumns,
    column: columnIndex,
  } = qFromUrl;

  // @ts-ignore
  const [featureSetId] = slug;
  const pathParts = ['datasets'].concat(slug);
  const columnsAll = featureSet?.sample_data?.columns || [];
  const columnName = columnsAll[columnIndex];
  const datasetName = featureSet?.metadata?.name || 'dataset';

  const breadcrumbs: BreadcrumbType[] = [];
  const tabQuery = `${TABS_QUERY_PARAM}=${tab || TAB_REPORTS}`;
  const showColumnsQuery = `${SHOW_COLUMNS_QUERY_PARAM}=${showColumns || 0}`;
  if (pathParts.length > 0) {
    pathParts.forEach((part, idx) => {
      let label: PageEnum | string = PageEnum.DATASETS;
      let href = `/${PageEnum.DATASETS}`;
      if (idx === 1) {
        label = datasetName.length > MAX_CHARS
          ? `${datasetName.slice(0, MAX_CHARS)}...`
          : datasetName;
        href = `/${PageEnum.DATASETS}/${featureSetId}?${tabQuery}&${showColumnsQuery}`;
      }

      const breadcrumb: BreadcrumbType = {
        bold: true,
        href,
        label,
      };
      breadcrumbs.push(breadcrumb);
    });
  }

  if (typeof columnIndex !== 'undefined' && columnName) {
    breadcrumbs.push({
      bold: true,
      label: columnName.length > MAX_CHARS
        ? `${columnName.slice(0, MAX_CHARS)}...`
        : columnName,
    });
  }

  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  lastBreadcrumb.selected = true;
  lastBreadcrumb.href = null;

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
