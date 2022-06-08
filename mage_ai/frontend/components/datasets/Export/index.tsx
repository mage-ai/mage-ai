import FeatureSetType from '@interfaces/FeatureSetType';
import DatasetDetail, { DatasetDetailSharedProps } from '../Detail';

function Export({
  ...props
}: DatasetDetailSharedProps) {
  return (
    <DatasetDetail {...props}>
      <div>
        Export
      </div>
    </DatasetDetail>
  );
}

export default Export;
