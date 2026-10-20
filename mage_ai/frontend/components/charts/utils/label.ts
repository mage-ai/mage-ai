import { isNumeric, roundNumber } from '@utils/string';
import { TooltipData } from '../BarChart/constants';

export const SCATTER_PLOT_X_LABEL_MAX_LENGTH = 20;
export const SCATTER_PLOT_Y_LABEL_MAX_LENGTH = 10;

export function formatNumberLabel(
  label: any,
  opts?: {
    maxFractionDigits?: number;
    minAmount?: number;
  },
) {
  const { maxFractionDigits, minAmount } = opts || {};
  const numberFormat = Intl.NumberFormat('en-US', {
    maximumFractionDigits: maxFractionDigits || 2,
    notation: 'compact',
  });

  if (typeof label !== 'number') {
    return label;
  }

  return label >= (minAmount || 10000) ? numberFormat.format(label) : label.toString();
}

export function truncateLabel(label, length) {
  const labelString = isNumeric(label) ? String(roundNumber(label, 1)) : String(label);

  return labelString.length > length ? `${labelString.substring(0, length)}...` : labelString;
}

export function getTooltipContentLength(renderTooltipContent: () => any) {
  if (typeof renderTooltipContent === 'undefined') {
    return 0;
  }
  const children = renderTooltipContent?.()?.props?.children;
  const childrenArr = Array.isArray(children) ? children : [children];

  return childrenArr.join('').length;
}
