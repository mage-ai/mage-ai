import { CommandCenterItemType, KeyValueType } from '@interfaces/CommandCenterType';

export type ApplicationProps = {
  applicationState: {
    current: KeyValueType;
  };
  executeAction: (item: CommandCenterItemType, focusedItemIndex: number) => Promise<any>;
  focusedItemIndex: number;
  item: CommandCenterItemType;
  refError?: any;
  removeApplication: () => void;
};
