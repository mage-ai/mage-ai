import * as osPath from 'path';

import adjectives from './samples/adjectives';
import letters from './samples/letters';
import moment from 'moment';
import nouns from './samples/nouns';
import numbers from './samples/numbers';
import { randomSample, range } from './array';

export function isJsonString(str) {
  if (!str) {
    return false;
  }

  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }

  return true;
}

export function isString(data) {
  return (typeof data === 'string');
}

export function replaceSpaces(string, replacement='_') {
  return string.split(' ').join(replacement);
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

export function pluralize(string, n, withCommas = false, wordOnly = false) {
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

  if (hasNumber && !wordOnly) {
    const numberText = withCommas ? numberWithCommas(number) : number;
    return `${numberText} ${word}`;
  }

  return word;
}

export function removeUnderscore(string) {
  return string?.replace(/_/g, ' ');
}

export function singularize(string) {
  const { length } = string;

  if (string.slice(length - 3, length) === 'ies') {
    return `${string.slice(0, length - 3)}y`;
  }

  if (string.slice(length - 2, length) === 'es' && string.slice(length - 3, length) !== 'ces') {
    return string.slice(0, length - 2);
  }

  if (string[length - 1] === 's') {
    return string.slice(0, length - 1);
  }

  return string;
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

export function lowercaseRemoveUnderscore(word = '') {
  return removeUnderscore(word.toLowerCase());
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

export function camelCaseToNormalWithSpaces(camelCaseString: string): string {
  return camelCaseString.replace(/([A-Z])/g, ' $1');
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

export function prettyUnitOfTime(secs) {
  const arr = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 7],
    ['week', 4],
    ['month', 12],
    ['year', null],
  ];
  let value;

  arr.forEach((pair, idx) => {
    if (value) {
      return;
    }

    const [unit, interval] = pair;
    const intervalPrevious = arr.slice(0, idx).reduce((acc, i) => acc * Number(i[1]), 1);
    if (secs < Number(interval) * intervalPrevious) {
      value = pluralize(unit, Math.round(secs / intervalPrevious));
    }
  });

  return value;
}

export function isNumeric(str) {
  if (typeof str === 'undefined' || str === null) {
    return false;
  }

  return !isNaN(str);
}

export function isInteger(str) {
  return Number.isInteger(Number(str));
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

export function randomNameGenerator() {
  return `${randomSample(adjectives)} ${randomSample(nouns)}`;
}

export function randomSimpleHashGenerator() {
  return `${randomSample(letters)}${randomSample(numbers)}`;
}

export function cleanName(name: string): string {
  return name?.toLowerCase().replace(/\W+/g, '_');
}

export function removeExtensionFromFilename(filename: string): string {
  const parts = filename.split(osPath.sep);
  const fileParts = parts[parts.length - 1].split('.');
  let fn;
  if (fileParts.length === 1) {
    fn = fileParts[0];
  } else {
    fn = fileParts.slice(0, -1).join('.');
  }
  return parts.slice(0, parts.length - 1).concat(fn).join(osPath.sep);
}

export function formatNumberToDuration(duration: number): string {
  let displayText = String(duration);
  if (duration) {
    if (duration >= 1000 * 60 * 60) {
      displayText = `${roundNumber(duration / (1000 * 60 * 60), 2)}h`;
    } else if (duration >= 1000 * 60) {
      displayText = `${roundNumber(duration / (1000 * 60), 2)}m`;
    } else if (duration >= 1000) {
      displayText = `${roundNumber(duration / (1000), 2)}s`;
    } else {
      displayText = `${duration}ms`;
    }
  }

  return displayText
}

export function alphabet(): string[] {
  const alpha = Array.from(Array(26)).map((e, i) => i + 65);
  return alpha.map((x) => String.fromCharCode(x));
}

export function removASCII(text: string): string {
  return text?.replace(/[^\x00-\x7F]/g, "");
}

export function hasANSI(text: string): boolean {
  return removeANSI(text) !== text;
}

export function removeANSI(text: string): string {
  return text?.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    '',
  );
}

export function stringSimilarity(str1: string, str2: string, gramSize: number = 2) {
  function getNGrams(s: string, len: number) {
    s = ' '.repeat(len - 1) + s.toLowerCase() + ' '.repeat(len - 1);
    let v = new Array(s.length - len + 1);
    for (let i = 0; i < v.length; i++) {
      v[i] = s.slice(i, i + len);
    }
    return v;
  }

  if (!str1?.length || !str2?.length) { return 0.0; }

  let s1 = str1.length < str2.length ? str1 : str2;
  let s2 = str1.length < str2.length ? str2 : str1;

  let pairs1 = getNGrams(s1, gramSize);
  let pairs2 = getNGrams(s2, gramSize);
  let set = new Set<string>(pairs1);

  let total = pairs2.length;
  let hits = 0;
  for (let item of pairs2) {
    if (set.delete(item)) {
      hits++;
    }
  }
  return hits / total;
}

export function longestCommonStartingSubstring(arr1: string[]): string {
  const arr = arr1.concat().sort();
  const a1 = arr[0];
  const a2 = arr[arr.length-1];
  const L = a1.length;

  let i = 0;

  while(i < L && a1.charAt(i) === a2.charAt(i)) i++;

  return a1.substring(0, i);
}

export function componentToHex(c) {
  const hex = c.toString(16);
  return hex.length == 1 ? '0' + hex : hex;
}

export function rgbToHex(r, g, b) {
  return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
