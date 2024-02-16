import { EventParametersType } from '@interfaces/EventPropertiesType';
import { getBrowser, getOS } from './os';
import { screenSizeName } from '@styles/theme';

export const DEMO_GA_MEASUREMENT_ID = 'G-2KDJWL94EN';

/*
 * NOTE: Google Analytics must be initialized in the _app.tsx file in
 * order to call the gtag methods below. It can be initialized with the
 * GoogleAnalytics component from the '@next/third-parties/google' package.
 */

// https://developers.google.com/analytics/devguides/collection/ga4/views
export const logGAPageview = (params?: {
  href?: string,
  title?: string,
}) => {
  const { href, title } = params || {};
  window.gtag?.('event', 'page_view', {
    page_location: href || window.location.href,
    page_title: title || document.title,
  });
};

// https://developers.google.com/tag-platform/gtagjs/reference#event
export const logGAEvent = (
  eventName: string,
  eventParameters: EventParametersType,
) => {
  window.gtag?.('event', eventName, {
    ...eventParameters,
  });
};

export const logUserOS = () => {
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : null;
  const screenSize = screenSizeName(screenWidth);
  window.gtag?.('event', 'os', {
    browser: getBrowser(),
    os: getOS(),
    screen_size: screenSize,
    width: screenWidth,
  });
};
