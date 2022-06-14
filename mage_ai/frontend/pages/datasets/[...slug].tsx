import { useRouter } from 'next/router';

import ClientOnly from '@hocs/ClientOnly';
import DatasetOverview from '@components/datasets/overview';
import Export from '@components/datasets/Export';
import Layout from '@oracle/components/Layout';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import { UNIT } from '@oracle/styles/units/spacing';
import { deserializeFeatureSet } from '@utils/models/featureSet';
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
  const { data: featureSetRaw, mutate } = api.feature_sets.detail(featureSetId);
  const { data: featureSetRawOriginal, mutateOriginal } = api.versions.feature_sets.detail(featureSetId, '0');
  const featureSet = featureSetRaw ? deserializeFeatureSet(featureSetRaw) : {};
  const featureSetOriginal = featureSetRawOriginal ? deserializeFeatureSet(featureSetRawOriginal) : {};

  const {
    metadata,
  } = featureSet || {};

  const sharedProps = {
    featureSet,
    featureSetOriginal,
    fetchFeatureSet: mutate,
    fetchFeatureSetOriginal: mutateOriginal,
    selectedColumnIndex: columnIndex,
  };

  const datasetName = metadata?.name;
  let el;
  let pageTitle = datasetName || 'Dataset Overview';
  if (slug.length === 1) {
    el = (
      <DatasetOverview
        {...sharedProps}
      />
    );
  } else if (SUBPATH_EXPORT === subpath) {
    el = (
      <Export
        {...sharedProps}
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
      <ClientOnly>
        {el}
      </ClientOnly>
    </Layout>
  );
}

export default DatasetDetail;
