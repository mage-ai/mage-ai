import { CommandCenterItemType, KeyValueType } from '@interfaces/CommandCenterType';

export type InvokeRequestOptionsType = {
  action: CommandCenterActionType;
  focusedItemIndex: number;
  index: number;
  item: CommandCenterItemType;
  results: KeyValueType;
};

export type InvokeRequestActionType = {
  invokeRequest?: (options: InvokeRequestOptionsType) => Promise<any>;
};

export type ApplicationProps = {
  applicationState: {
    current: KeyValueType;
  };
  executeAction: (item: CommandCenterItemType, focusedItemIndex: number) => Promise<any>;
  focusedItemIndex: number;
  item: CommandCenterItemType;
  itemsRef?: any;
  refError?: any;
  removeApplication: () => void;
  router: any;
} & InvokeRequestActionType;
