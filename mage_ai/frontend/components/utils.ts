import { useRouter } from 'next/router';

import {
  COLUMN_QUERY_PARAM,
  SHOW_COLUMNS_QUERY_PARAM,
  TABS_QUERY_PARAM,
} from '@components/datasets/overview/constants';
import { PageEnum } from '@components/PageBreadcrumbs';
import { queryFromUrl } from '@utils/url';

export const POSITIVE_QUALITY = ['Good', 'Best'];
export const NEGATIVE_QUALITY = ['Bad', 'Worse', 'Worst'];

export const isBadQuality = (quality: string) => (
  NEGATIVE_QUALITY.includes(quality)
);

export const isGoodQuality = (quality: string) => !isBadQuality(quality);

export const createDatasetTabRedirectLink = (
  tab: string,
  columnIndex: number,
) => {
  const router = useRouter();
  const { slug = [] }: any = router.query;
  const [featureSetId] = slug;

  const {
    show_columns: showColumns,
    column: columnIndexFromQuery,
  } = queryFromUrl();

  const path = `/${PageEnum.DATASETS}/${featureSetId}`;
  const columnQueryParam = `${COLUMN_QUERY_PARAM}=${columnIndexFromQuery || columnIndex}`;
  const queryParams =
    `${TABS_QUERY_PARAM}=${tab}&${columnQueryParam}&${SHOW_COLUMNS_QUERY_PARAM}=${showColumns || 0}`;

  return `${path}?${queryParams}`;
};
