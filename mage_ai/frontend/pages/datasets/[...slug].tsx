import { useRouter } from 'next/router';

import ColumnDetail from '@components/datasets/columns/ColumnDetail';
import ColumnList from '@components/datasets/columns/ColumnList';
import DatasetOverview from '@components/datasets/overview';
import api from '@api';

function DatasetDetail() {
  const router = useRouter();
  const { slug = [] } = router.query;


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
      <DatasetOverview
        featureSet={featureSet}
        fetchFeatureSet={mutate}
      />
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
