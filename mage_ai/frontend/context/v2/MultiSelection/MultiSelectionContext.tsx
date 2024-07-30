import { RectType } from '@mana/shared/interfaces';
import React, { useContext } from 'react';

export interface SelectableItemType {
  getRect?: () => RectType;
  item: any;
  itemRef?: React.MutableRefObject<HTMLElement | HTMLDivElement>;
  rect?: RectType;
}

export interface MultiSelectionContextHandlers {
  clearSelection: () => void;
  deregister: () => void;
  register: (
    containerRef: MultiSelectionContextClientType['containerRef'],
    items: MultiSelectionContextClientType['items'],
    onSelectItem: MultiSelectionContextClientType['onSelectItem'],
    opts?: {
      onActivated?: MultiSelectionContextClientType['onActivated'],
      onHighlightItem?: MultiSelectionContextClientType['onHighlightItem'],
    },
  ) => void;
}

export type OnSelectItemType = (
  event: MouseEvent,
  item: SelectableItemType,
  matchItems: Record<string, SelectableItemType>,
) => void;

export interface MultiSelectionContextClientType {
  containerRef: React.MutableRefObject<HTMLElement | HTMLDivElement>;
  items: Record<string, SelectableItemType>;
  onSelectItem: OnSelectItemType;
  onActivated?: (event: KeyboardEvent) => void,
  onHighlightItem?: OnSelectItemType;
}

export interface MultiSelectionContextType {
  useRegistration: (uuid: string) => MultiSelectionContextHandlers;
}

export const MultiSelectionContext = React.createContext<MultiSelectionContextType>({
  useRegistration: () => {
    throw new Error('MultiSelectionContext is not implemented');
  },
});

export const useMultiSelection = () => useContext(MultiSelectionContext);
