import { CommandCenterActionType, CommandCenterItemType, ItemApplicationType, KeyValueType } from '@interfaces/CommandCenterType';
import { ExecuteActionableType } from '../constants';

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
  focusedItemIndex: number;
  item: CommandCenterItemType;
  itemsRef?: any;
  refError?: any;
  removeApplication: () => void;
  router: any;
  showError?: (opts: {
    errors: any;
    response: any;
  }) => void;
} & InvokeRequestActionType & ExecuteActionableType;
