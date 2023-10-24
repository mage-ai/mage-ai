import { useMemo } from 'react';

import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import api from '@api';
import { featureEnabled } from '.';

function useProject(): {
  featureEnabled: (featureUUID: FeatureUUIDEnum) => boolean;
  featureUUIDs: FeatureUUIDEnum;
  fetchProjects: () => any;
  project: ProjectType;
} {
  const { data: dataProjects, mutate: fetchProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);

  return {
    featureEnabled: (featureUUID: FeatureUUIDEnum): boolean => featureEnabled(project, featureUUID),
    featureUUIDs: FeatureUUIDEnum,
    fetchProjects,
    project,
  };
}

export default useProject;
