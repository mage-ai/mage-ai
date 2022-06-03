import ApiReloader from '@components/ApiReloader';
import ColumnDetail from '@components/datasets/columns/ColumnDetail';
import ColumnList from '@components/datasets/columns/ColumnList';
import DatasetOverview from '@components/datasets/overview';
import FeatureSetType from '@interfaces/FeatureSetType';
import api from '@api';

type DatasetDetailProps = {
  featureSet: FeatureSetType;
  slug: string[];
};

function DatasetDetail({
  featureSet,
  slug = [],
}: DatasetDetailProps) {
  // @ts-ignore
  const [featureSetId, _, featureId] = slug;

  const sharedProps = {
    featureSet,
    featureSetId,
  };

  let el;
  if (slug.length === 1) {
    el = (
      <DatasetOverview
        featureSet={featureSet}
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

  return (
    <ApiReloader uuid="feature_sets.detail">
      {el}
    </ApiReloader>
  );
}

DatasetDetail.getInitialProps = async (ctx: any) => {
  const { slug: slugArr }: { slug: string[] } = ctx.query;
  const featureSetId = (slugArr || [])[0];
  const response = await api.feature_sets.detailAsync(ctx, featureSetId);

  return {
    featureSet: {
      ...response,
    },
    slug: slugArr,
  };
};

export default DatasetDetail;
