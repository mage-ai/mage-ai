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
  BLOCK = 'block',
  NODE = 'node',
  PORT = 'port',
}

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
  FIT_TO_CHILDREN = 'fit_to_children',
  GRID = 'grid',
  LAYOUT_GRID = 'layout_grid',
  LAYOUT_RECTANGLE = 'layout_rectangle',
  LAYOUT_SPIRAL = 'layout_spiral',
  LAYOUT_TREE = 'layout_tree',
  LAYOUT_WAVE = 'layout_wave',
  MIN_DIMENSIONS = 'min_dimensions',
  PAD = 'pad',
  SHIFT = 'shift',
  SHIFT_INTO_PARENT = 'shift_into_parent',
  UPDATE = 'update',
}
