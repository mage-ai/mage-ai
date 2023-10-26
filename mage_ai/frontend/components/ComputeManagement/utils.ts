import ProjectType from '@interfaces/ProjectType';
import { ComputeServiceEnum } from './constants';
import { isEmptyObject } from '@utils/hash';

export function getComputeServiceFromProject(project: ProjectType): ComputeServiceEnum {
  if (!isEmptyObject(project?.spark_config || {})) {
    if (!isEmptyObject(project?.emr_config || {})) {
      return ComputeServiceEnum.AWS_EMR;
    } else {
      return ComputeServiceEnum.STANDALONE_CLUSTER;
    }
  }
}
