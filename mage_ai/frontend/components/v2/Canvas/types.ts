export enum LayoutVerticalAlignmentEnum {
  BOTTOM = 'bottom',
  CENTER = 'center',
  TOP = 'top',
}

export enum LayoutHorizontalAlignmentEnum {
  CENTER = 'center',
  LEFT = 'left',
  RIGHT = 'right',
}

export enum LayoutDisplayEnum {
  DETAILED = 'detailed',
  SIMPLE = 'simple',
}

export enum ItemStatusEnum {
  INITIALIZED = 'initialized',
  PENDING_LAYOUT = 'pending_layout',
  READY = 'ready',
}
export enum LayoutConfigDirectionEnum {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export enum LayoutConfigDirectionOriginEnum {
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
}

export enum PortSubtypeEnum {
  INPUT = 'input',
  OUTPUT = 'output',
}

export enum ItemTypeEnum {
  APP = 'app',
  BLOCK = 'block',
  NODE = 'node',
  OUTPUT = 'output',
  PORT = 'port',
}

export const ITEM_TYPES = [
  ItemTypeEnum.APP,
  ItemTypeEnum.BLOCK,
  ItemTypeEnum.NODE,
  ItemTypeEnum.OUTPUT,
  ItemTypeEnum.PORT,
];

export enum ColorEnum {
  BLUE = 'blue',
  YELLOW = 'yellow',
}

export enum RectTransformationScopeEnum {
  CHILDREN = 'children', // all the children in a parent
  PARENT = 'parent', // when within children, operate on parent
  SELF = 'self', // 1 by 1
}

export enum TransformRectTypeEnum {
  ALIGN_CHILDREN = 'align_children',
  ALIGN_WITHIN_VIEWPORT = 'align_within_viewport',
  CENTER = 'center',
  FIT_TO_CHILDREN = 'fit_to_children',
  FIT_TO_SELF = 'fit_to_self',
  GRID = 'grid',
  LAYOUT_GRID = 'layout_grid',
  LAYOUT_SPIRAL = 'layout_spiral',
  LAYOUT_TREE = 'layout_tree',
  LAYOUT_WAVE = 'layout_wave',
  MIN_DIMENSIONS = 'min_dimensions',
  NO_OP = 'no_op',
  PAD = 'pad',
  RESET = 'reset',
  SHIFT = 'shift',
  SHIFT_INTO_PARENT = 'shift_into_parent',
  UPDATE = 'update',
}

export enum LayoutStyleEnum {
  GRID = TransformRectTypeEnum.LAYOUT_GRID,
  SPIRAL = TransformRectTypeEnum.LAYOUT_SPIRAL,
  TREE = TransformRectTypeEnum.LAYOUT_TREE,
  WAVE = TransformRectTypeEnum.LAYOUT_WAVE,
}
