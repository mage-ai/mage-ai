import App, { AppContext, AppProps } from 'next/app';
import dynamic from 'next/dynamic';

import { ModeEnum } from '@mana/themes/modes';

import '@styles/globals.css';
import '@styles/scss/globals/dark.scss';
import '@styles/scss/globals/light.scss';
import'react-toastify/dist/ReactToastify.min.css';

function MainApp({ version, ...props }: { mode: ModeEnum, version?: string } & AppProps) {
  if (version === 'v2') {
    const AppV2 = dynamic(() => import('@components/NextAppV2'));

    return <AppV2  {...props} />;
  }

  // @ts-ignore
  const AppV1 = dynamic(() => import('@components/NextAppV1'));

  return <AppV1 {...props} />;
}

MainApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);

  return {
    ...appProps,
    version: appProps?.pageProps?.version,
  };
};

export default MainApp;
