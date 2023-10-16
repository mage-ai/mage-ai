import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';

export function featureEnabled(project: ProjectType, featureUUID: featureUUIDEnum): boolean {
  return !!project?.features?.[featureUUID];
}
