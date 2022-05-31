export const formatNumber = (value) => {
  const [integer, float] = String(value).split('.');
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${float ? `.${float}` : ''}`;
};

export const transformNumber = (value, decimalPlaces = 3) => {
  let parsedNumber = parseFloat(value).toFixed(decimalPlaces);
  if (value === 0) {
    parsedNumber = parseFloat(value).toFixed(0);
  }

  return formatNumber(parsedNumber);
};

export function formatDollarAmountFromCents(value) {
  const amountInDollars = value / 100;

  return `$${transformNumber(amountInDollars, 2)}`;
}

export function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

export function getPercentage(number) {
  const percentage = (number === 1 || number === 0)
    ? (number * 100)
    : (number * 100).toFixed(2);

  return `${percentage}%`;
}
