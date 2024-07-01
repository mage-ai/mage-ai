import { ExecutionManagerType } from '../../../ExecutionManager/interfaces';

export interface PipelineDetailProps {
  frameworkUUID?: string;
  registerConsumer: ExecutionManagerType['registerConsumer'];
  uuid?: string;
}
