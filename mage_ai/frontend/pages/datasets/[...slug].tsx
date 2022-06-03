import { useRouter } from 'next/router';

import ApiReloader from '@components/ApiReloader';
import ColumnDetail from '@components/datasets/columns/ColumnDetail';
import ColumnList from '@components/datasets/columns/ColumnList';
import DatasetOverview from '@components/datasets/overview';

function DatasetDetail() {
  const router = useRouter();
  const { slug = [] } = router.query;

  // @ts-ignore
  const [featureSetId, _, featureId] = slug;

  let el;
  if (slug.length === 1) {
    el = <DatasetOverview slug={featureSetId} />;
  } else if (slug.length === 2) {
    el = <ColumnList featureSetId={featureSetId} />;
  } else if (slug.length === 3) {
    el = (
      <ColumnDetail
        featureId={featureId}
        featureSetId={featureSetId}
      />
    );
  } else {
    el = <div />;
  }

  return (
    <ApiReloader uuid="feature_sets.detail">
      {el}
    </ApiReloader>
  );
}

export default DatasetDetail;
