import { useRouter } from 'next/router';

import ApiReloader from '@components/ApiReloader';
import DatasetOverview from '@components/datasets/overview';

function DatasetDetail() {
  const router = useRouter();
  const { slug } = router.query;

  return (
    <ApiReloader uuid="feature_sets.detail">
      <DatasetOverview slug={slug} />
    </ApiReloader>
  );
}

export default DatasetDetail;
