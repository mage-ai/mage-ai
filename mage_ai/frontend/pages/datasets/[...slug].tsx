import { useRouter } from 'next/router';

import ClientOnly from '@hocs/ClientOnly';
import ColumnDetail from '@components/datasets/columns/ColumnDetail';
import ColumnList from '@components/datasets/columns/ColumnList';
import DatasetOverview from '@components/datasets/overview';
import api from '@api';
import { queryFromUrl } from '@utils/url';

function DatasetDetail() {
  const router = useRouter();
  const {
    slug = [],
  } = router.query;
  const {
    column: columnIndex,
  } = queryFromUrl();

  // @ts-ignore
  const [featureSetId, _, featureId] = slug;
  const { data: featureSet, mutate } = api.feature_sets.detail(featureSetId);

  const sharedProps = {
    featureSet,
    featureSetId,
  };

  let el;
  if (slug.length === 1) {
    el = (
      <ClientOnly>
        <DatasetOverview
          featureSet={featureSet}
          fetchFeatureSet={mutate}
          selectedColumnIndex={columnIndex}
        />
      </ClientOnly>
    );
  } else if (slug.length === 2) {
    el = (
      <ColumnList
        {...sharedProps}
      />
    );
  } else if (slug.length === 3) {
    el = (
      <ColumnDetail
        featureId={featureId}
        {...sharedProps}
      />
    );
  } else {
    el = <div />;
  }

  return el;
}

export default DatasetDetail;
