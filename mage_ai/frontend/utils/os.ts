import OSEnum, { BrowserEnum } from '@interfaces/OSType';

export function getOS() {
  let os: OSEnum = OSEnum.MAC;
  if (typeof window === 'undefined') {
    return os;
  }
  const userAgent = window?.navigator?.userAgent;

  //@ts-ignore
  // We fall back to checking the User-Agent string if a browser does not support the properties below.
  const platform = window?.navigator?.userAgentData?.platform || window?.navigator?.platform;

  const macosPlatforms = ['macOS', 'Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'];
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'];
  const iosPlatforms = ['iPhone', 'iPad', 'iPod'];

  if (platform) {
    if (macosPlatforms.includes(platform)) {
      os = OSEnum.MAC;
    } else if (windowsPlatforms.includes(platform)) {
      os = OSEnum.WINDOWS;
    } else if (iosPlatforms.includes(platform)) {
      os = OSEnum.IOS;
    }
  } else if (userAgent) {
    if (userAgent.includes('Macintosh')) {
      os = OSEnum.MAC;
    } else if (userAgent.includes('Windows')) {
      os = OSEnum.WINDOWS;
    } else if (userAgent.includes('Linux') && userAgent.includes('X11')) {
      os = OSEnum.LINUX;
    } else if (/(iPhone|iPad)/.test(userAgent)) {
      os = OSEnum.IOS;
    } else if (userAgent.includes('Android') && userAgent.includes('Mobi')) {
      os = OSEnum.ANDROID;
    } else if (userAgent.includes('CrOS')) {
      os = OSEnum.CHROME_OS;
    }
  }

  return os;
}

export function isMac() {
  return getOS() === OSEnum.MAC;
}

// This may not be a completely reliable way to detect what browser the user is using,
// but it can give a general idea of the proportion of browser types used.
export function getBrowser() {
  let browser: BrowserEnum = BrowserEnum.UNKNOWN;
  if (typeof window === 'undefined') {
    return browser;
  }

  const userAgent = window?.navigator?.userAgent;
  if (userAgent) {
    if (userAgent.includes('Opera') || userAgent.includes('Opr')) {
      browser = BrowserEnum.OPERA;
    } else if (userAgent.includes('Edg')) {
      browser = BrowserEnum.EDGE;
    } else if (userAgent.includes('Chrome')) {
      browser = BrowserEnum.CHROME;
    } else if (userAgent.includes('Safari')) {
      browser = BrowserEnum.SAFARI;
    } else if (userAgent.includes('Firefox')) {
      browser = BrowserEnum.FIREFOX;
    }
  }

  return browser;
}

export default OSEnum;
