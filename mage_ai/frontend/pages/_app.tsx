import App, { AppContext, AppProps } from 'next/app';
import dynamic from 'next/dynamic';

function MainApp({ version, ...props }: { version?: string } & AppProps) {
  if (version === 'v2') {
    const GlobalCss = dynamic(() => import('@styles/scss/globals.scss').then(mod => mod.Hello));
    const AppV2 = dynamic(() => import('@components/NextAppV2'));

    return (
      <>
        <GlobalCss />
        <AppV2 {...props} />
      </>
    );
  }

  const GlobalCss = dynamic(() => import('@styles/globals.css').then(mod => mod.Hello));
  const ReactToastifyCss = dynamic(() =>
    import('react-toastify/dist/ReactToastify.min.css').then(mod => mod.Hello),
  );
  // @ts-ignore
  const AppV1 = dynamic(() => import('@components/NextAppV1'));

  return (
    <>
      <GlobalCss />
      <ReactToastifyCss />
      <AppV1 {...props} />
    </>
  );
}

MainApp.getInitialProps = async (appContext: AppContext) => {
  const appProps = await App.getInitialProps(appContext);

  return {
    ...appProps,
    version: appProps?.pageProps?.version,
  };
};

export default MainApp;
