import ComputeServiceType from '@interfaces/ComputeServiceType';
import api from '@api';

type ClustersType = {
  computeService: ComputeServiceType;
}

function Clusters({
  computeService: computeServiceProp,
}: ClustersType) {
  const {
    data: dataComputeService,
    mutate: fetchComputeService,
  } = api.compute_services.detail(computeServiceProp?.uuid, {
    with_clusters: true,
  }, {}, {
    key: `compute_services/${computeServiceProp?.uuid}/with_clusters`,
  });

  const computeService: ComputeServiceType = useMemo(() => ({
    ...computeServiceProp,
    ...(dataComputeService?.compute_service || {}),
  }), [
    computeServiceProp,
    dataComputeService,
  ]);

  return (
    <>
    </>
  );
}

export default Clusters;
