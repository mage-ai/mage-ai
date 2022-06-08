import FeatureSetType from '@interfaces/FeatureSetType';
import DatasetDetail from '../Detail';

type ExportProps = {
  featureSet: FeatureSetType;
};

function Export({
  featureSet,
}: ExportProps) {
  return (
    <DatasetDetail>
      <div>
      </div>
    </DatasetDetail>
  );
}

export default Export;
