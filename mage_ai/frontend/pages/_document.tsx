import Document, {
  DocumentContext,
  Head,
  Html,
  Main,
  NextScript,
} from 'next/document';
import { BaseCSS } from 'styled-bootstrap-grid';
import { ServerStyleSheet } from 'styled-components';

// @ts-ignore
export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(
              <>
                <BaseCSS />
                <App {...props} />
              </>,
            ),
        });

      const initialProps = await Document.getInitialProps(ctx);

      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <link href="/favicon.ico" rel="icon" />
        </Head>
        <body style={{ backgroundImage: 'url(https://steamuserimages-a.akamaihd.net/ugc/965368466523576783/6FC151F69A2DA52CAB4B7E55D098CE609F38CB4D/?imw=5000&imh=5000&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false)' }}>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
