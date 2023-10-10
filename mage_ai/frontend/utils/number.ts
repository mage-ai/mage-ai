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
  if (number === undefined) {
    return '';
  }

  const percentage = (number === 1 || number === 0)
    ? (number * 100)
    : (number * 100).toFixed(2);

  return `${percentage}%`;
}

export function calculateChange(endValue, startValue) {
  if (typeof startValue === 'undefined') {
    return 0;
  }

  const difference = endValue - startValue;
  return difference / startValue;
}

export function calculateStartTimestamp(timeIntervalInSec: number) {
  const currentTimestampInSec = Math.floor(Date.now() / 1000);
  if (timeIntervalInSec > 0) {
    return currentTimestampInSec - timeIntervalInSec;
  }

  return currentTimestampInSec;
}

export function numberToBinaryString(dec: number): string {
  // dec = 15
  // => '1111'
  return (dec >>> 0).toString(2);
}

export function addBinaryStrings(bin1: string, bin2: string): string {
  // bin1: '10'
  // bin2: '1'
  // result: 11n
  return String(BigInt(bin1) + BigInt(bin2));
}

export function minusBinaryStrings(bin1: string, bin2: string): string {
  // bin1: '111'
  // bin2: '100'
  // result: '11'
  return String(BigInt(bin1) - BigInt(bin2));
}

export function binaryStringToNumber(binaryString: string): number {
  // binaryString = '1111'
  // => 15
  return parseInt(binaryString, 2);
}
