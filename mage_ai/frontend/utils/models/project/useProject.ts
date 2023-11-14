import { useMemo } from 'react';

import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import api from '@api';
import { featureEnabled } from '.';

function useProject(): {
  featureEnabled: (featureUUID: FeatureUUIDEnum) => boolean;
  featureUUIDs: any;
  fetchProjects: () => any;
  project: ProjectType;
  sparkEnabled: boolean;
} {
  const { data: dataProjects, mutate: fetchProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
  const computeManagementEnabled: boolean =
    featureEnabled(project, FeatureUUIDEnum.COMPUTE_MANAGEMENT);

  return {
    featureEnabled: (featureUUID: FeatureUUIDEnum): boolean => featureEnabled(project, featureUUID),
    // featureUUIDs: Object.keys(FeatureUUIDEnum).reduce((acc, key) => ({
    //   ...acc,
    //   [key]: FeatureUUIDEnum[key],
    // }), {}),
    featureUUIDs: FeatureUUIDEnum,
    fetchProjects,
    project,
    sparkEnabled: computeManagementEnabled
      && project.spark_config
      && Object.keys(project.spark_config || {})?.length >= 1,
  };
}

export default useProject;
