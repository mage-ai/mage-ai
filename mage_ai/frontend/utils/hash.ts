export function selectEntriesWithValues(obj) {
  const finalObj = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (typeof v !== 'undefined' && v !== null) {
      finalObj[k] = v;
    }
  });

  return finalObj;
}

export function getNestedTruthyValuesCount(obj) {
  return Object.entries(obj).reduce((count, [key, cv]) => {
    if (cv !== null && typeof cv === 'object' && !Array.isArray(cv)) {
      const additionalCount = Object.values(cv).filter(v => !!v).length;
      count += additionalCount;
    } else {
      count += !!cv ? 1 : 0;
    }

    return count;
  }, 0);
}

export function ignoreKeys(d, keys) {
  const copy = { ...d };

  keys.forEach(key => delete copy[key]);

  return copy;
}

export function isObject(variable: any) {
  return (
    typeof variable === 'object' &&
    !Array.isArray(variable) &&
    variable !== null
  );
}

export function isEmptyObject(obj, opts?: {
  idIsInObject?: boolean;
}) {
  const idIsInObject = opts?.idIsInObject;
  const obj2 = { ...obj };
  if (!idIsInObject) {
    obj2.id = null;
  }
  const values = Object.values(obj2);

  return values.every(
    (val) => val === null
      || (Array.isArray(val) && val.length === 0)
      || JSON.stringify(val) === '{}',
  );
}

export function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function pickKey(obj) {
  const keys = Object.keys(obj);
  return keys.filter(k => obj[k]);
}

export function selectKeys(obj, keys) {
  return keys.reduce((acc, key) => {
    if (obj[key]) {
      acc[key] = obj[key];
    }

    return acc;
  }, {});
}

export const dig = (o, sArg) => {
  let s = String(sArg);

  s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
  s = s.replace(/^\./, ''); // strip a leading dot
  const a = s.split('.');
  for (let i = 0, n = a.length; i < n; ++i) {
    const k = a[i];
    if (k in o) {
      o = o[k];
    } else {
      return;
    }
  }
  return o;
};
