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
