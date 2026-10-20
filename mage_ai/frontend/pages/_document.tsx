import Document, { DocumentContext, Head, Html, Main, NextScript } from 'next/document';
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
          enhanceApp: App => props =>
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
          <script
            dangerouslySetInnerHTML={{
              __html: `
// Polyfill for requestIdleCallback and cancelIdleCallback only if not supported and for Safari
(function() {
    function isSafari() {
        var ua = navigator.userAgent;
        return /Safari/.test(ua) && !/Chrome/.test(ua);
    }

    // Check if requestIdleCallback is not available or if the browser is Safari
    if (!('requestIdleCallback' in window) || isSafari()) {
        window.requestIdleCallback = function (callback, options) {
            const timeout = options && options.timeout ? options.timeout : 50;
            const start = Date.now();

            return setTimeout(() => {
                callback({
                    didTimeout: false,
                    timeRemaining: function () {
                        return Math.max(0, timeout - (Date.now() - start));
                    }
                });
            }, 1);
        };

        window.cancelIdleCallback = function (id) {
            clearTimeout(id);
        };
    }
})();
              `,
            }}
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
