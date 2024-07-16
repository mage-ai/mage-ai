import { ExecutionManagerType } from '../../../ExecutionManager/interfaces';

export interface PipelineDetailProps {
  frameworkUUID?: string;
  useExecuteCode: ExecutionManagerType['useExecuteCode'];
  useRegistration: ExecutionManagerType['useRegistration'];
  uuid?: string;
}
