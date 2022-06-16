import {
  COLUMN_QUERY_PARAM,
  TABS_QUERY_PARAM,
  SHOW_COLUMNS_QUERY_PARAM,
} from '@components/datasets/overview';
import { PageEnum } from '@components/PageBreadcrumbs';
import { queryFromUrl } from '@utils/url';
import { useRouter } from 'next/router';

export const POSITIVE_QUALITY = ['Good', 'Best'];
export const NEGATIVE_QUALITY = ['Bad', 'Worse', 'Worst'];

export const isBadQuality = (quality: string) => (
  NEGATIVE_QUALITY.includes(quality)
);

export const isGoodQuality = (quality: string) => !isBadQuality(quality);

export const createDatasetTabRedirectLink = (
  tab: string,
) => {
  const router = useRouter();
  const { slug = [] }: any = router.query;
  const [featureSetId] = slug;

  const {
    show_columns: showColumns,
    column: columnIndex,
  } = queryFromUrl();

  const path = `/${PageEnum.DATASETS}/${featureSetId}`;
  const queryParams =
    `${TABS_QUERY_PARAM}=${tab}&${COLUMN_QUERY_PARAM}=${columnIndex || 0}&${SHOW_COLUMNS_QUERY_PARAM}=${showColumns || 0}`;

  return `${path}?${queryParams}`;
};
