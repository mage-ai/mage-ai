import { CommandCenterItemType } from '@interfaces/CommandCenterType';

export type ApplicationProps = {
  executeAction: (item: CommandCenterItemType, focusedItemIndex: number) => Promise<any>;
  focusedItemIndex: number;
  item: CommandCenterItemType;
  removeApplication: () => void;
};
