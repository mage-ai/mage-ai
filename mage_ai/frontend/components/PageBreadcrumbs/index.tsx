import React from 'react';
import { useRouter } from 'next/router';

import Breadcrumbs from '@oracle/components/Breadcrumbs';
import FeatureSetType from '@interfaces/FeatureSetType';
import { BreadcrumbType } from '@oracle/components/Breadcrumbs/Breadcrumb';
import {
  SHOW_COLUMNS_QUERY_PARAM,
  TAB_REPORTS,
  TABS_QUERY_PARAM,
} from 'components/datasets/overview/constants';
import { queryFromUrl } from '@utils/url';

export enum PageEnum {
  DATASETS = 'datasets',
  DATASET_DETAIL = 'dataset_detail',
  COLUMNS = 'features',
  COLUMN_DETAIL = 'feature_detail',
  EXPORT = 'export',
}

type PageBreadcrumbsProps = {
  featureSet: FeatureSetType;
  setColumnListMenuVisible: (visible: boolean) => void;
};

const MAX_CHARS = 35;

function PageBreadcrumbs({
  featureSet,
  setColumnListMenuVisible,
}: PageBreadcrumbsProps, ref) {
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
      } else if (part === PageEnum.EXPORT) {
        label =  PageEnum.EXPORT;
        href = `/${PageEnum.DATASETS}/${featureSetId}/${PageEnum.EXPORT}`;
      }

      const breadcrumb: BreadcrumbType = {
        bold: true,
        href,
        label,
        title: idx === 1 ? datasetName : null,
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
      title: columnName,
    });
  }

  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  lastBreadcrumb.selected = true;
  lastBreadcrumb.href = null;
  if (lastBreadcrumb.label !== PageEnum.EXPORT) {
    lastBreadcrumb.button = true;
    lastBreadcrumb.onClick = () => setColumnListMenuVisible(true);
  }

  return (
    <Breadcrumbs
      breadcrumbs={breadcrumbs}
      large
      linkProps={{
        noHoverUnderline: true,
      }}
      ref={ref}
    />
  );
}

export default React.forwardRef(PageBreadcrumbs);
