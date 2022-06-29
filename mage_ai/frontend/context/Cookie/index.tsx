import React, { useContext } from 'react';

export type CookieType = {
  initialAsPath: string;
  initialPathname: string;
  notificationTemplate: string;
  notificationUUID: string;
  referringURL: string;
};

const DEFAULT_PROPS = {
  initialAsPath: null,
  initialPathname: null,
  notificationTemplate: null,
  notificationUUID: null,
  referringURL: null,
};
const CookieContext = React.createContext<CookieType>(DEFAULT_PROPS);

export const useCookie = () => useContext(CookieContext) || DEFAULT_PROPS;

export default CookieContext;
