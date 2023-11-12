import AWSEMRClusterType from './AWSEMRClusterType';
import ComputeConnectionType, {
  ComputeConnectionActionEnum,
  ComputeConnectionUUIDEnum,
  SSHTunnelType,
} from '@interfaces/ComputeConnectionType';
import ComputeServiceType from '@interfaces/ComputeServiceType';

type ConnectionSettingsProps = {
  computeService: ComputeServiceType;
  connections: ComputeConnectionType[];
  fetchComputeConnections: () => void;
}

function ConnectionSettings({
  computeService,
  connections,
  fetchComputeConnections,
}: ConnectionSettingsProps) {
  return (
    <>
    </>
  );
}

export default ConnectionSettings;
