import GoogleSignIn from '@components/Sessions/GoogleSignIn';
import MicrosoftSignIn from '@components/Sessions/MicrosoftSignIn';
import OidcSignIn from '@components/Sessions/OidcSignIn';
import OktaSignIn from '@components/Sessions/OktaSignIn';

export enum OauthProviderEnum {
  ACTIVE_DIRECTORY = 'active_directory',
  BITBUCKET = 'bitbucket',
  GITHUB = 'github',
  GITLAB = 'gitlab',
  GOOGLE = 'google',
  OIDC_GENERIC = 'oidc_generic',
  OKTA = 'okta',
}

export const OAUTH_PROVIDER_SIGN_IN_MAPPING = {
  [OauthProviderEnum.ACTIVE_DIRECTORY]: MicrosoftSignIn,
  [OauthProviderEnum.GOOGLE]: GoogleSignIn,
  [OauthProviderEnum.OIDC_GENERIC]: OidcSignIn,
  [OauthProviderEnum.OKTA]: OktaSignIn,
};

export default interface OauthType {
  provider?: string;
  authenticated?: boolean;
  expires?: string;
  url?: string;
  redirect_query_params?: any;
}
