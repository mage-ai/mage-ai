import BlockType from '@interfaces/BlockType';
import { DEBUG } from '@components/v2/utils/debug';
import { FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { ItemTypeEnum, LayoutDisplayEnum, LayoutStyleEnum } from '../../../Canvas/types';
import { LayoutConfigType } from '../../../Canvas/interfaces';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import {
  RectTransformationScopeEnum, LayoutVerticalAlignmentEnum, LayoutHorizontalAlignmentEnum,
  LayoutConfigDirectionEnum, TransformRectTypeEnum
} from '../../../Canvas/types';
import { RectTransformationType } from '../../../Canvas/interfaces';
import { RectType } from '@mana/shared/interfaces';
import { calculateBoundingBox } from '../../../Canvas/utils/rect';
import { flattenArray } from '@utils/array';
import { validateFiniteNumber } from '@utils/number';

type BlockNodeType = {
  block: BlockType | FrameworkType;
  node: {
    type: ItemTypeEnum;
  };
  rect: RectType;
};

export function hydrateBlockNodeRects(
  blockNodes: BlockNodeType[],
  blockNodeMapping: Record<string, BlockNodeType>,
): RectType[] {
  return blockNodes.map((bn: BlockNodeType) => {
    const {
      block,
      node,
      rect,
    } = bn ?? {};

    return {
      ...rect,
      block,
      children: hydrateBlockNodeRects(
        ((block as any)?.children ?? [])?.map((b: any) => blockNodeMapping[b.uuid]),
        blockNodeMapping,
      ),
      id: block?.uuid,
      type: node?.type,
      upstream: hydrateBlockNodeRects(
        ((block as any)?.upstream ?? [])?.map((b: any) => blockNodeMapping[b.uuid]),
        blockNodeMapping,
      ),
    };
  });
}

export function buildRectTransformations({
  layoutConfig,
  selectedGroup,
}: {
  layoutConfig?: LayoutConfigType;
  selectedGroup?: MenuGroupType;
}): RectTransformationType[] {
  const layoutStyle = layoutConfig?.style ?? LayoutStyleEnum.WAVE;
  const direction = layoutConfig?.direction || LayoutConfigDirectionEnum.HORIZONTAL;
  const directionOp = LayoutConfigDirectionEnum.HORIZONTAL === direction
    ? LayoutConfigDirectionEnum.VERTICAL
    : LayoutConfigDirectionEnum.HORIZONTAL;
  const viewportRef = layoutConfig?.viewportRef;

  DEBUG.rects && console.log('buildRectTransformations', layoutConfig, selectedGroup);

  const layoutStyleTransformations = [];

  const shiftHorizontal = (factor: number = 2) => (rects: RectType[]) => Math.max(
    40,
    validateFiniteNumber(typeof window !== 'undefined'
      ? (window.innerWidth - calculateBoundingBox(rects).width) / factor : 0),
  );
  const shiftVertical = (factor: number = 2) => (rects: RectType[]) => Math.max(
    40,
    validateFiniteNumber(typeof window !== 'undefined'
      ? (window.innerHeight - calculateBoundingBox(rects).height) / factor : 0),
  );

  const tree = {
    options: () => ({
      layout: {
        ...layoutConfig ?? {},
        gap: { column: 40, row: 40 },
        options: {
          horizontalAlignment: LayoutHorizontalAlignmentEnum.CENTER,
          stagger: 200,
          verticalAlignment: LayoutVerticalAlignmentEnum.CENTER,
        },
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_TREE,
  };

  const wave = {
    options: () => ({
      layout: {
        ...layoutConfig ?? {},
        gap: { column: 40, row: 40 },
        options: { amplitude: 200, wavelength: 100 },
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_WAVE,
  };
  const grid = {
    options: () => ({
      layout: {
        ...layoutConfig ?? {},
        gap: { column: 40, row: 40 },
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_GRID,
  };
  const spiral = {
    options: () => ({
      layout: {
        ...layoutConfig ?? {},
        gap: { column: 40, row: 40 },
        options: { angleStep: Math.PI / 12, initialAngle: Math.PI / 6 },
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_SPIRAL,
  };

  if (layoutConfig?.rectTransformations) {
    layoutConfig?.rectTransformations?.forEach(({
      type,
    }) => {
      if (TransformRectTypeEnum.LAYOUT_TREE === type) {
        layoutStyleTransformations.push(tree);
      } else if (TransformRectTypeEnum.LAYOUT_WAVE === type) {
        layoutStyleTransformations.push(wave);
      } else if (TransformRectTypeEnum.LAYOUT_GRID === type) {
        layoutStyleTransformations.push(grid);
      } else if (TransformRectTypeEnum.LAYOUT_SPIRAL === type) {
        layoutStyleTransformations.push(spiral);
      }
    });
  }

  const conditionHeight = (rects: RectType[]) => {
    const box = calculateBoundingBox(rects);
    // Total height is less than 80% of the viewport height
    return 0.8 > (box?.height / viewportRef?.current?.getBoundingClientRect()?.height);
  };
  const conditionWidth = (rects: RectType[]) => {
    const box = calculateBoundingBox(rects);
    // Total width is less than 80% of the viewport width
    return 0.8 > (box?.width / viewportRef?.current?.getBoundingClientRect()?.width);
  };
  const conditionDimensions =
    LayoutConfigDirectionEnum.HORIZONTAL === direction ? conditionHeight : conditionWidth;
  const conditionallySwitchDirections = (patterns) => patterns.concat(patterns.map(pattern => ({
    ...pattern,
    condition: (args: any) => !conditionDimensions(args),
    options: () => ({ layout: { direction: directionOp } }),
  })));


  const reset = { type: TransformRectTypeEnum.RESET };
  const transformers: RectTransformationType[] = [reset];

  const layoutPattern = () => {
    const patternMapping = {
      [LayoutDisplayEnum.DETAILED]: {
        [LayoutStyleEnum.GRID]: [grid],
        [LayoutStyleEnum.SPIRAL]: [spiral],
        [LayoutStyleEnum.TREE]: [tree],
        [LayoutStyleEnum.WAVE]: [wave],
      },
      [LayoutDisplayEnum.SIMPLE]: {
        [LayoutStyleEnum.GRID]: [grid],
        [LayoutStyleEnum.SPIRAL]: [spiral],
        [LayoutStyleEnum.TREE]: [tree, {
          ...wave,
          condition: (args: any) => !conditionDimensions(args),
          options: () => ({
            layout: {
              ...layoutConfig ?? {},
              gap: { column: 40, row: 40 },
              options: { amplitude: 400, wavelength: 100 },
            },
          }),
        }],
        [LayoutStyleEnum.WAVE]: [wave, {
          ...tree,
          condition: (args: any) => !conditionDimensions(args),
        }],
      },
    }

    const pattern = patternMapping[layoutConfig?.display]?.[layoutStyle];
    return conditionallySwitchDirections(pattern ?? [wave]);
  };

  const viewportAlignment = [
    {
      condition: conditionWidth,
      options: () => ({
        boundingBox: viewportRef?.current?.getBoundingClientRect(),
        layout: { direction: LayoutConfigDirectionEnum.HORIZONTAL },
      }),
      type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
    },
    {
      condition: conditionHeight,
      options: () => ({
        boundingBox: viewportRef?.current?.getBoundingClientRect(),
        layout: { direction: LayoutConfigDirectionEnum.VERTICAL },
      }),
      type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
    },
  ];

  if (LayoutDisplayEnum.DETAILED === layoutConfig?.display) {
    const activeGroupConditionSelf = (rect: RectType) => {
      const group = selectedGroup;
      return !group?.uuid || (rect?.block?.uuid === group?.uuid && rect?.children?.length > 0);
    };
    const activeGroupConditionChild = (rect: RectType) => {
      const group = selectedGroup;
      return !group?.uuid || rect?.parent?.block?.uuid === group?.uuid;
    };

    transformers.push(...[
      {
        conditionSelf: activeGroupConditionChild,
        options: () => ({ layout: { direction: directionOp } }),
        scope: RectTransformationScopeEnum.CHILDREN,
        type: TransformRectTypeEnum.LAYOUT_GRID,
      },
      {
        conditionSelf: activeGroupConditionSelf,
        options: (rects: RectType[]) => ({
          offset: {
            left: 0,
            top: Math.max(
              ...flattenArray(rects?.map(rect => rect.children)).map(
                (rect) => {
                  const val = (rect?.inner?.badge?.height ?? 0) +
                    (rect?.inner?.badge?.offset?.top ?? 0) +
                    (rect?.inner?.title?.height ?? 0) +
                    (rect?.inner?.title?.offset?.top ?? 0);

                  return validateFiniteNumber(val) ?? 0;
                }
              ),
            ),
          },
          padding: {
            bottom: 12,
            left: 12,
            right: 12,
            top: 24,
          },
        }),
        scope: RectTransformationScopeEnum.SELF,
        type: TransformRectTypeEnum.FIT_TO_CHILDREN,
      },
      ...layoutPattern(),
      ...viewportAlignment,
      {
        conditionSelf: (rect: RectType) => rect?.children?.length === 0,
        options: (rects: RectType[]) => ({
          offset: {
            left: shiftHorizontal()(rects),
            top: shiftVertical()(rects),
          },
        }),
        type: TransformRectTypeEnum.SHIFT,
      },
      {
        conditionSelf: activeGroupConditionChild,
        scope: RectTransformationScopeEnum.CHILDREN,
        type: TransformRectTypeEnum.SHIFT_INTO_PARENT,
      },
      {
        conditionSelf: activeGroupConditionChild,
        scope: RectTransformationScopeEnum.CHILDREN,
        type: TransformRectTypeEnum.ALIGN_CHILDREN,
      },
      {
        conditionSelf: (rect: RectType) =>
          // If the top of the rect is less than 5% of the viewport height
          (rect.top / viewportRef?.current?.getBoundingClientRect()?.height) < 0.05,
        options: (rects: RectType[]) => ({
          boundingBox: viewportRef?.current?.getBoundingClientRect(),
          offset: { top: shiftVertical(0.5)(rects) },
        }),
        scope: RectTransformationScopeEnum.SELF,
        type: TransformRectTypeEnum.SHIFT,
      },
      {
        conditionSelf: (rect: RectType) =>
          // If the top of the rect is more than 95% of the viewport height
          (rect.top / viewportRef?.current?.getBoundingClientRect()?.height) > 0.95,
        options: (rects: RectType[]) => ({
          boundingBox: viewportRef?.current?.getBoundingClientRect(),
          offset: { top: shiftVertical(-0.5)(rects) },
        }),
        scope: RectTransformationScopeEnum.SELF,
        type: TransformRectTypeEnum.SHIFT,
      },
      {
        conditionSelf: (rect: RectType) =>
          // If the left of the rect is less than 5% of the viewport width
          (rect.left / viewportRef?.current?.getBoundingClientRect()?.width) < 0.05,
        options: (rects: RectType[]) => ({
          boundingBox: viewportRef?.current?.getBoundingClientRect(),
          offset: { left: shiftHorizontal(0.5)(rects) },
        }),
        scope: RectTransformationScopeEnum.SELF,
        type: TransformRectTypeEnum.SHIFT,
      },
      {
        conditionSelf: (rect: RectType) =>
          // If the left of the rect is more than 95% of the viewport width
          (rect.left / viewportRef?.current?.getBoundingClientRect()?.width) > 0.95,
        options: (rects: RectType[]) => ({
          boundingBox: viewportRef?.current?.getBoundingClientRect(),
          offset: { left: shiftHorizontal(-0.5)(rects) },
        }),
        scope: RectTransformationScopeEnum.SELF,
        type: TransformRectTypeEnum.SHIFT,
      },
    ] as RectTransformationType[]);
  } else if (LayoutDisplayEnum.SIMPLE === layoutConfig?.display) {
    transformers.push(...[
      ...layoutPattern(),
      ...viewportAlignment,
    ] as RectTransformationType[]);
  }

  DEBUG.rects && console.log('transformers', transformers);

  return transformers;
}
