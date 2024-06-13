import App, { AppContext, AppProps } from 'next/app';
import dynamic from 'next/dynamic';

import '@styles/globals.css';
import '@styles/scss/globals/main.scss';
import '@styles/scss/globals/dark.scss';
import '@styles/scss/globals/light.scss';
import 'react-toastify/dist/ReactToastify.min.css';
import { getCurrentTheme } from '@oracle/styles/themes/utils';

function MainApp(props: AppProps & { version?: string }) {
  if (props?.version === 'v2') {
    const AppV2 = dynamic(() => import('@components/NextAppV2'));
    // @ts-ignore
    return <AppV2 {...props} />;
  }

  // @ts-ignore
  const AppV1 = dynamic(() => import('@components/NextAppV1'));
  // @ts-ignore
  return <AppV1 {...props} />;
}

MainApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);

  return {
    ...appProps,
    currentTheme: getCurrentTheme(appContext.ctx),
    version: appProps?.pageProps?.version,
  };
};

export default MainApp;
