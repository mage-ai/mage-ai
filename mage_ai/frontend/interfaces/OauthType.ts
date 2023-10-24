export enum OauthProviderEnum {
  ACTIVE_DIRECTORY = 'active_directory',
  GITHUB = 'github',
}

export default interface OauthType {
  access_token?: string;
  provider: string;
}
