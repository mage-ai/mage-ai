import { BlockTypeEnum } from './BlockType';
import { ConfigurationType } from './ChartBlockType';

export enum DataIntegrationTypeEnum {
  DESTINATIONS = 'destinations',
  SOURCES = 'sources',
}

export enum TemplateTypeEnum {
  DATA_INTEGRATION = 'data_integration',
}

export default interface BlockTemplateType {
  block_type: BlockTypeEnum;
  configuration?: ConfigurationType;
  description: string;
  groups?: string[];
  language: string;
  name: string;
  path: string;
  template_type?: TemplateTypeEnum;
  template_variables?: {
    [key: string]: string | number;
  };
}
