type OpenBlockBrowserModalOptionsType = {
  blockIndex?: number;
};

export type OpenBlockBrowserModalType = {
  showBlockBrowserModal?: (opts?: OpenBlockBrowserModalOptionsType) => void;
};
