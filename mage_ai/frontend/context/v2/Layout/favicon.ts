export enum FaviconStatusEnum {
  BUSY = 'busy',
  ERROR = 'error',
  NOTICE = 'notice',
  SUCCESS = 'success',
}

export const changeFavicon = (iconURL: string) => {
  const link: HTMLLinkElement | null = document.querySelector('link[rel*=\'icon\']');

  if (link) {
    link.href = iconURL;
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'shortcut icon';
    newLink.href = iconURL;
    document.head.appendChild(newLink);
  }
};
