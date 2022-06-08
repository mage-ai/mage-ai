import moment from 'moment';

export const DATE_FORMAT_SHORT = 'YYYY-MM-DD';

export function isString(data) {
  return (typeof data === 'string');
}

export function addUnderscores(string) {
  return string.split(' ').join('_');
}

export function capitalize(word) {
  if (!word) {
    return '';
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function formatDateShort(momentObj) {
  return momentObj.format(DATE_FORMAT_SHORT);
}

export function dateFormatShort(text) {
  return formatDateShort(moment(text));
}

export function dateFormatLong(text) {
  return moment(text).format('YYYY-MM-DD HH:mm');
}

export function dateFormatLongFromUnixTimestamp(text) {
  return moment.unix(text).format('YYYY-MM-DD HH:mm');
}

export function formattedQuantity(quantity, decimalPlaces = 4) {
  let n = `${quantity}`;
  if (Number.isInteger(quantity)) {
    n = `${quantity}.0`;
  }
  const parts = n.split('.');
  const zeroesNeeded = parts[1].length < 4 ? decimalPlaces - parts[1].length + 1 : 0;

  return n + Array(zeroesNeeded).join('0');
}

export function getNewUUID(randomSeed = 1) {
  return String(new Date().getTime() * randomSeed);
}

export function hashCode(str) {
  let hash = 0;

  if (str.length === 0) {
    return hash;
  }

  str.split('').forEach((c, idx) => {
    const charCode = str.charCodeAt(idx);
    /* eslint-disable-next-line no-bitwise */
    hash = (hash << 5) - hash + charCode;
    // Convert to 32bit integer
    /* eslint-disable-next-line no-bitwise */
    hash &= hash;
  });

  return hash;
}

export function lowercase(word) {
  return word.charAt(0).toLowerCase() + word.slice(1);
}

export function numberWithCommas(x) {
  if (x === null || typeof x === 'undefined') {
    return '';
  }

  const x2 = x.toString();
  const [wholeNumber, decimals] = x2.split('.');

  const final = wholeNumber.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (decimals) {
    return `${final}.${decimals}`;
  }

  return final;
}

export function pascalize(word) {
  return word
    .split(' ')
    .map((wrd) => capitalize(wrd))
    .join('_')
    .split('_')
    .map((wrd) => capitalize(wrd))
    .join('');
}

export function pluralize(string, n) {
  let number = n;
  const hasNumber = number !== undefined && number !== null;
  if (!hasNumber) {
    number = 2;
  }
  let word;
  if (number === 1) {
    word = string;
  } else {
    const { length } = string;
    const lastLetter = string[length - 1];
    if (lastLetter === 'y' && string !== 'day') {
      word = `${string.slice(0, length - 1)}ies`;
    } else if (lastLetter === 's') {
      word = `${string}es`;
    } else {
      word = `${string}s`;
    }
  }

  if (hasNumber) {
    return `${number} ${word}`;
  }

  return word;
}

export function removeUnderscore(string) {
  return string.replace(/_/g, ' ');
}

export function singularize(string) {
  const { length } = string;
  if (string.slice(length - 3, length) === 'ies') {
    return `${string.slice(0, length - 3)}y`;
  }
  if (string.slice(length - 2, length) === 'es') {
    return string.slice(0, length - 2);
  }

  return string.slice(0, length - 1);
}

export function titleize(word) {
  return word
    .split(' ')
    .map((wrd) => capitalize(wrd))
    .join('_')
    .split('_')
    .map((wrd) => capitalize(wrd))
    .join(' ');
}

export function capitalizeRemoveUnderscoreLower(word = '') {
  return capitalize(removeUnderscore(word.toLowerCase()));
}

export function abbreviateNumber(value) {
  let newValue = value;
  if (value >= 1000) {
    const suffixes = ['', 'k', 'm', 'b', 't'];
    const suffixNum = Math.floor(`${value}`.length / 3);
    let shortValue: any = '';

    for (let precision = 2; precision >= 1; precision--) {
      shortValue = parseFloat(
        (suffixNum !== 0 ? value / 1000 ** suffixNum : value).toPrecision(precision),
      );

      const dotLessShortValue = `${shortValue}`.replace(/[^a-zA-Z 0-9]+/g, '');

      if (dotLessShortValue.length <= 2) {
        break;
      }
    }

    if (shortValue % 1 !== 0) {
      shortValue = shortValue.toFixed(1);
    }

    newValue = shortValue + suffixes[suffixNum];
  }

  return newValue;
}

export function snakeCaseToUrlPathname(snakeCaseString) {
  return snakeCaseString.split('_').join('-');
}

export function timeBetween(startAt, endAt) {
  const hours = endAt.diff(startAt, 'hours');
  const minutes = endAt.diff(startAt, 'minutes');
  const seconds = endAt.diff(startAt, 'seconds');

  return [
    String(hours).padStart(2, '0'),
    String(minutes - (60 * hours)).padStart(2, '0'),
    String(seconds - (60 * minutes)).padStart(2, '0'),
  ].join(':');
}

export function minutesRemaining(startAt, timeToCompleteInSec) {
  const endAt = startAt.add(timeToCompleteInSec, 's');

  return endAt.diff(moment(), 'minutes');
}

export function timeRemaining(startAt, timeToCompleteInSec) {
  const endAt = startAt.add(timeToCompleteInSec, 's');
  const minutes = endAt.diff(moment(), 'minutes');
  const seconds = endAt.diff(moment(), 'seconds');

  return [
    String(minutes < 0 ? 0 : minutes).padStart(2, '0'),
    String(seconds < 0 ? 0 : (seconds - (60 * minutes))).padStart(2, '0'),
  ].join(':');
}

export function isNumeric(str) {
  if (typeof str !== 'string') {
    return false;
  }

  return !Number.isNaN(str) && !Number.isNaN(parseFloat(str));
}

export function extractNumber(text) {
  const matches = text.match(/%{\d+}/) || [];
  return matches[0]?.slice(2, -1);
}

export function removePercent(text) {
  const matches = text.match(/\d+(\.?\d*)%/) || [];
  return Number(matches[0]?.slice(0,-1));
}

export function changeDecimalToWholeNumber(number, floatingPoints = 2) {
  return Math.round((number || 0) * (100 ** floatingPoints)) / 100;
}

export function formatPercent(decimal) {
  return `${numberWithCommas(changeDecimalToWholeNumber(decimal))}%`;
}

export function roundNumber(number, floatingPoints = 2) {
  const denom = 10 ** floatingPoints;
  return Math.round((number || 0) * denom) / denom;
}
