import { useMemo } from 'react';

import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import api from '@api';
import { featureEnabled } from '.';

function useProject(): {
  featureEnabled: (featureUUID: FeatureUUIDEnum) => boolean;
  // @ts-ignore
  featureUUIDs: {
    ADD_NEW_BLOCK_V2: FeatureUUIDEnum;
    COMPUTE_MANAGEMENT: FeatureUUIDEnum;
    DATA_INTEGRATION_IN_BATCH_PIPELINE: FeatureUUIDEnum;
    INTERACTIONS: FeatureUUIDEnum;
    NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW: FeatureUUIDEnum;
    LOCAL_TIMEZONE: FeatureUUIDEnum;
    OPERATION_HISTORY: FeatureUUIDEnum;
  };
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
    featureUUIDs: FeatureUUIDEnum,
    fetchProjects,
    project,
    sparkEnabled: computeManagementEnabled
      && (project.spark_config || project.emr_config)
      && (
        Object.keys(project.spark_config || {})?.length >= 1
          || Object.keys(project.emr_config || {})?.length >= 1
      ),
  };
}

export default useProject;
