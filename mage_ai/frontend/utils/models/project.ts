import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';

export function featureEnabled(project: ProjectType, featureUUID: FeatureUUIDEnum): boolean {
  return !!project?.features?.[featureUUID];
}
