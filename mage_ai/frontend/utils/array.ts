import { dig } from '@utils/hash';
import { isNumeric } from './string';

export function insertAtIndex(item, idx, arr) {
  const copy1 = arr.slice(0, idx);
  const copy2 = arr.slice(idx, arr?.length);

  const arrNew = [];

  arrNew.push(...copy1);
  arrNew.push(item);
  arrNew.push(...copy2);

  return arrNew;
}

export function pushAtIndex(item, idx, arr) {
  const copy = arr.slice();
  copy.splice(idx, 0, item);

  return copy;
}

export function pushUnique(item, arr, func) {
  const copy = arr.slice();

  if (!find(arr, func)) {
    copy.push(item);
  }

  return copy;
}

export function appendArray(value, arrArg) {
  const newArray = arrArg.slice();
  newArray.push(value);

  return newArray;
}

export function find(arr, func) {
  return arr?.find(func);
}

export function findClosestNum(arr, num) {
  return arr.reduce((prev, curr) => (
    Math.abs(curr - num) < Math.abs(prev - num) ? curr : prev
  ));
}

export function groupBy(arr, func) {
  return arr?.reduce((acc, obj) => {
    const key = func(obj);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(obj);

    return acc;
  }, {});
}

export function indexBy(arr, func) {
  return arr?.reduce(
    (acc, obj) => ({
      ...acc,
      [func(obj)]: obj,
    }),
    {},
  );
}

export function indexByKeyWithValue(arr, keyFunc, valFunc) {
  return arr?.reduce(
    (acc, obj) => ({
      ...acc,
      [keyFunc(obj)]: valFunc(obj),
    }),
    {},
  );
}

export function maxInArray(arr, func) {
  return arr?.reduce((max, n) => (func(n) > func(max) ? n : max), arr[0]);
}

export function minInArray(arr, func) {
  return arr?.reduce((min, n) => (func(n) < func(min) ? n : min), arr[0]);
}

export function prependArray(value, arrArg) {
  const newArray = arrArg?.slice();
  newArray?.unshift(value);

  return newArray;
}

export function sortByKey(arr, sort, opts: any = {}) {
  const {
    ascending = true,
    absoluteValue = false,
  } = opts;

  const sortingFunc = (typeof sort === 'string' || typeof sort === 'number')
    ? val => absoluteValue ? Math.abs(dig(val, sort)) : dig(val, sort)
    : val => absoluteValue ? Math.abs(sort(val)) : sort(val);

  return [...arr].sort((a, b) => {
    let sortingOrder = 0;

    if (sortingFunc(a) > sortingFunc(b)) {
      sortingOrder = ascending ? 1 : -1;
    } else if (sortingFunc(a) < sortingFunc(b)) {
      sortingOrder = ascending ? -1 : 1;
    }

    return sortingOrder;
  });
}

export function sortTuplesArrayByFirstItem(arr, opts: any = {}) {
  const { ascending = true } = opts;

  return arr.sort((a, b) => {
    let sortingOrder = 0;
    if (a[0] > b[0]) {
      sortingOrder = ascending ? 1 : -1;
    } else if (a[0] < b[0]) {
      sortingOrder = ascending ? -1 : 1;
    }

    return sortingOrder;
  });
}

export function splitIntoChunks(arr, numChunks) {
  const arrCopy = [...arr];
  const matrix = [];
  while (arrCopy.length) {
    matrix.push(arrCopy.splice(0, numChunks));
  }

  return matrix;
}

export function uniqueArray(arrArg) {
  return arrArg.filter((elem, pos, arr) => arr.c(elem) === pos);
}

export function unique(arrArg, compare) {
  return arrArg.reduce((uniqueArg, item) => {
    const arr = uniqueArg.map(compare);

    return arr.includes(compare(item)) ? uniqueArg : [...uniqueArg, item];
  }, []);
}

export function transpose(array) {
  return array[0].map((_, colIndex) => array.map(row => row[colIndex]));
}

export function binarySearch(array, pred) {
  let lo = -1, hi = array.length;
  while (1 + lo < hi) {
    const mi = lo + ((hi - lo) >> 1);

    if (pred(array[mi])) {
      lo = mi;
    } else {
      hi = mi;
    }
  }
  return hi;
}

export function remove(arr, func) {
  const idx = arr.findIndex(func);

  return removeAtIndex(arr, idx);
}

export function removeAtIndex(items, i) {
  return items.slice(0, i).concat(items.slice(i + 1, items.length));
}

export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function equals(a, b) {
  return a.map(i => String(i)).join() === b.map(i => String(i)).join();
}

export function greaterThan(a, b) {
  return a > b;
}

export function lessThan(a, b) {
  return a < b;
}

export function arrayIncludesArray(arr1, arr2) {
  const mapping = indexBy(arr2, val => val);

  let result = true;

  arr1.forEach((val) => {
    if (!mapping[val]) {
      result = false;
    }
  });

  return result;
}

export function range(numberOfItems) {
  if (isNumeric(numberOfItems) && numberOfItems >= 1) {
    return Array(numberOfItems).fill(0);
  }
  return [];
}

export function rangeSequential(numberOfItems, startingIndex = 0) {
  let range = Array.from(Array(numberOfItems).keys());

  if (startingIndex !== 0) {
    range = range.map(n => n + startingIndex);
  }

  return range;
}

export function sum(arrayOfNumbers) {
  function add(accumulator, a) {
    return accumulator + a;
  }

  return arrayOfNumbers.reduce(add, 0);
}

export function standardDeviation(arr, usePopulation = false) {
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
  return Math.sqrt(
    arr.reduce((acc, val) => acc.concat((val - mean) ** 2), []).reduce((acc, val) => acc + val, 0) /
      (arr.length - (usePopulation ? 0 : 1))
  );
}

export function randomSample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function intersection(arr1: any[], arr2: any[], parser?: (item: any) => any): any[] {
  const arr3 = parser ? arr2.map(parser) : arr2;

  return arr1.filter((item: any) => {
    const i = parser ? parser(item) : item;

    return arr3.includes(i);
  });
}
