import ProjectPlatformType from './ProjectPlatformType';

interface MediaType {
  file_path?: string;
  url?: string;
}

interface DesignComponentConfigurationsType {
  media?: MediaType;
}

interface DesignPageConfigurationsType {
  edit: {
    [key: string]: string;
  };
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
