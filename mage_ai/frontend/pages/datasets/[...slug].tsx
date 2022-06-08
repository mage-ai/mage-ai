import { useRouter } from 'next/router';

import ClientOnly from '@hocs/ClientOnly';
import DatasetOverview from '@components/datasets/overview';
import Export from '@components/datasets/Export';
import Layout from '@oracle/components/Layout';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import { UNIT } from '@oracle/styles/units/spacing';
import { queryFromUrl } from '@utils/url';

const SUBPATH_EXPORT = 'export';

function DatasetDetail() {
  const router = useRouter();
  const {
    slug = [],
  } = router.query;
  const {
    column: columnIndex,
  } = queryFromUrl();

  // @ts-ignore
  const [featureSetId, subpath] = slug;
  const { data: featureSet, mutate } = api.feature_sets.detail(featureSetId);
  const {
    metadata,
  } = featureSet || {};

  const datasetName = metadata?.name;
  let el;
  let pageTitle = datasetName || 'Dataset Overview';
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
  } else if (SUBPATH_EXPORT === subpath) {
    el = (
      <Export
        featureSet={featureSet}
      />
    );
    pageTitle = `Export ${datasetName}`;
  } else {
    el = <div />;
  }

  return (
    <Layout
      centerAlign
      footer={<Spacing mt={UNIT} />}
      fullWidth
      pageTitle={pageTitle}
    >
      {el}
    </Layout>
  );
}

export default DatasetDetail;
