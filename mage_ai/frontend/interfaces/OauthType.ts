export enum OathProviderEnum {
  GITHUB = 'github',
}

export default interface OauthType {
  access_token?: string;
  provider: string;
}
