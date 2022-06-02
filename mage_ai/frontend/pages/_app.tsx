import App, { AppProps } from 'next/app';
import { ThemeProvider } from 'styled-components';

import '@styles/globals.css';
import light from '@oracle/styles/themes/light';
import { ThemeType } from '@oracle/styles/themes/constants';
import { theme as stylesTheme } from '@styles/theme';

type AppInternalProps = {
  themeProps?: {
    currentTheme?: any;
  };
  version: number;
};

type MyAppProps = {
  currentTheme: ThemeType;
  pageProps: AppInternalProps;
};

function MyApp(props: MyAppProps & AppProps) {
  const {
    Component,
    currentTheme,
    pageProps,
  } = props;
  const {
    themeProps = {},
    version = 1,
  } = pageProps;

  return (
    <ThemeProvider
      theme={Object.assign(
        stylesTheme,
        themeProps?.currentTheme || currentTheme,
      )}
    >
      {/* @ts-ignore */}
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

MyApp.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);

  return {
    ...appProps,
    currentTheme: light,
  };
};

export default MyApp;
