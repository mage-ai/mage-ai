export default interface ProjectType {
  help_improve_mage?: boolean;
  latest_version: string;
  name: string;
  project_uuid?: string;
  version: string;
}

export enum ProjectTypeEnum {
  MAIN = 'main',
  STANDALONE = 'standalone',
  SUB = 'sub',
}
