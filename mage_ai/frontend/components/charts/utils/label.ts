import { isNumeric, roundNumber } from "@utils/string";

export const SCATTER_PLOT_X_LABEL_MAX_LENGTH = 20;
export const SCATTER_PLOT_Y_LABEL_MAX_LENGTH = 10;

const numberFormat = Intl.NumberFormat('en-US', {
  notation: "compact",
  maximumFractionDigits: 2,
})

export function formatNumberLabel(label) {
  if (typeof label !== 'number') {
    return label
  } 
  return label >= 10000 ? numberFormat.format(label) : label.toString();
}

export function truncateLabel(label, length) {
  const labelString = isNumeric(label) ? String(roundNumber(label, 1)) : String(label)

  return labelString.length > length
          ? `${labelString.substring(0, length)}...`
          : labelString;
}
