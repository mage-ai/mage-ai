import { CommandCenterActionType, CommandCenterItemType, ItemApplicationType, KeyValueType } from '@interfaces/CommandCenterType';
import { ExecuteActionableType, FetchItemsType, HandleSelectItemRowType } from '../constants';

export type InvokeRequestOptionsType = {
  abortController?: any;
  action: CommandCenterActionType;
  focusedItemIndex: number;
  index: number;
  item: CommandCenterItemType;
  results: KeyValueType;
  timeout?: number;
};

export type InvokeRequestActionType = {
  invokeRequest?: (options: InvokeRequestOptionsType) => Promise<any>;
};

export type CurrentType = {
  focusedItemIndex: number;
  item: CommandCenterItemType;
} & ExecuteActionableType;

export type ApplicationProps = {
  application: ItemApplicationType;
  applicationState: {
    current: KeyValueType;
  };
  applicationsRef: {
    current: CurrentType[];
  };
  closeCommandCenter: () => void;
  closeOutput?: () => void;
  focusedItemIndex: number;
  getItemsActionResults?: () => KeyValueType;
  item: CommandCenterItemType;
  itemsRef?: any;
  refError?: any;
  removeApplication: () => void;
  router: any;
  showError?: (opts: {
    errors: any;
    response: any;
  }) => void;
} & InvokeRequestActionType & ExecuteActionableType & FetchItemsType & HandleSelectItemRowType;
