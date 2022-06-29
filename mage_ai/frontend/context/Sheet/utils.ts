export const hideSheets = (key, sheets, opts = {}) => {
  const obj = sheets && sheets[key];

  if (!obj) {
    return sheets;
  }

  return {
    ...sheets,
    [key]: {
      ...obj,
      ...opts,
      visible: false,
    },
  };
};
