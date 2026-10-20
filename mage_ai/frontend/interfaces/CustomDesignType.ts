import ProjectPlatformType from './ProjectPlatformType';

interface MediaType {
  file_path?: string;
  url?: string;
}

interface DesignComponentConfigurationsType {
  media?: MediaType;
}

export interface UIElementConfigurationsType {
  items?: string[];
  items_more?: string[];
}

interface UIComponentConfigurationsType {
  add?: UIElementConfigurationsType;
}

interface ResourceUIComponentConfigurationsType {
  block?: UIComponentConfigurationsType;
}

interface PageComponentConfigurationsType {
  buttons?: ResourceUIComponentConfigurationsType;
}

interface DesignPageConfigurationsType {
  edit?: PageComponentConfigurationsType;
  list?: PageComponentConfigurationsType;
}

interface DesignComponentsType {
  header?: DesignComponentConfigurationsType;
}

interface DesignPagesType {
  pipelines?: DesignPageConfigurationsType;
}

export default interface CustomDesignType {
  components?: DesignComponentsType;
  pages?: DesignPagesType;
  project?: ProjectPlatformType;
  uuid: string;
}
