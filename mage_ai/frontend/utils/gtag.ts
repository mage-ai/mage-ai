export const DEMO_GA_MEASUREMENT_ID = 'G-XXX';

/*
 * NOTE: Google Analytics must be initialized in the _app.tsx file in
 * order to call the gtag methods below. It can be initialized with the
 * GoogleAnalytics component from the '@next/third-parties/google' package.
 */

// https://developers.google.com/analytics/devguides/collection/ga4/views
export const pageview = (params?: {
  href?: string,
  title?: string,
}) => {
  const { href, title } = params || {};
  window.gtag?.('event', 'page_view', {
    page_location: href || window.location.href,
    page_title: title || document.title,
  });
};

type GTagEvent = {
  action: string;
  category: string;
  label: string;
  url?: string;
};

// https://developers.google.com/tag-platform/gtagjs/reference#event
export const event = ({ action, category, label, url }: GTagEvent) => {
  window.gtag?.('event', action, {
    event_category: category,
    event_label: label,
    page_path: url,
  });
};
