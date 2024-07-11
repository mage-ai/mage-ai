import BlockType from '@interfaces/BlockType';
import { BlockMappingType, GroupMappingType, LayoutConfigType, RectType } from '../../../Canvas/interfaces';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import update from 'immutability-helper';
import { BlocksByGroupType, RectTransformationType } from '../../../Canvas/interfaces';
import { DEBUG } from '@components/v2/utils/debug';
import { FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { ItemTypeEnum, LayoutDisplayEnum, LayoutStyleEnum } from '../../../Canvas/types';
import { RectTransformationScopeEnum, LayoutConfigDirectionEnum, TransformRectTypeEnum } from '../../../Canvas/types';
import { calculateBoundingBox, transformRects as transformRectsBase } from '../../../Canvas/utils/rect';
import { flattenArray, indexBy } from '@utils/array';
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
) {
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

  const layoutStyleTransformations = [];

  const shiftRight = (factor: number = 2) => (rects: RectType[]) => Math.max(
    40,
    validateFiniteNumber(typeof window !== 'undefined'
      ? (window.innerWidth - calculateBoundingBox(rects).width) / factor : 0),
  );
  const shiftDown = (factor: number = 2) => (rects: RectType[]) => Math.max(
    40,
    validateFiniteNumber(typeof window !== 'undefined'
      ? (window.innerHeight - calculateBoundingBox(rects).height) / factor : 0),
  );

  const tree = {
    options: () => ({ layout: { direction: direction } }),
    type: TransformRectTypeEnum.LAYOUT_TREE,
  };

  const wave = {
    options: () => ({
      layout: update(layoutConfig ?? {}, {
        gap: {
          $set: {
            column: 40,
            row: 40,
          },
        },
      }),
      layoutOptions: { amplitude: 200, wavelength: 100 }
    }),
    type: TransformRectTypeEnum.LAYOUT_WAVE,
  };
  const grid = {
    options: () => ({
      layout: update(layoutConfig, {
        gap: {
          $set: {
            column: 40,
            row: 40,
          },
        },
      }),
    }),
    type: TransformRectTypeEnum.LAYOUT_GRID,
  };
  const spiral = {
    options: () => ({
      layout: update(layoutConfig, {
        containerRef: {
          $set: viewportRef,
        },
        gap: {
          $set: {
            column: 160,
            row: 160,
          },
        },
      }),
      layoutOptions: {
        angleStep: Math.PI / 12,
        initialAngle: Math.PI / 6,
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

  const LAYOUT_STYLE_MAPPING = {
    [LayoutStyleEnum.GRID]: [grid],
    [LayoutStyleEnum.SPIRAL]: [spiral],
    [LayoutStyleEnum.TREE]: [tree],
    [LayoutStyleEnum.WAVE]: [wave],
  };

  const transformers: RectTransformationType[] = [];

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
      ...(LAYOUT_STYLE_MAPPING[layoutStyle] ?? [wave]),
      {
        ...(LAYOUT_STYLE_MAPPING[layoutStyle] ?? [wave]),
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.width > viewportRef?.current?.getBoundingClientRect()?.width;
        },
        options: () => ({ layout: { direction: LayoutConfigDirectionEnum.VERTICAL } }),
      },
      {
        // conditionSelf: (rect: RectType) => rect?.children?.length === 0,
        options: (rects: RectType[]) => ({
          offset: {
            left: shiftRight()(rects),
            top: shiftDown()(rects),
          },
        }),
        type: TransformRectTypeEnum.SHIFT,
      },
      {
        options: () => ({
          boundingBox: viewportRef?.current?.getBoundingClientRect(),
          layout: {
            direction: LayoutConfigDirectionEnum.VERTICAL,
          },
        }),
        type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
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
    ] as RectTransformationType[]);
  } else if (LayoutDisplayEnum.SIMPLE === layoutConfig?.display) {
    transformers.push(...[
      {
        ...wave,
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return 0.75 > (box?.height / viewportRef?.current?.getBoundingClientRect()?.height);
        },
        options: () => ({
          layout: update(layoutConfig ?? {}, {
            gap: {
              $set: {
                column: 40,
                row: 40,
              },
            },
          } as any),
          layoutOptions: { amplitude: 400, wavelength: 100 },
        }),
      },
      {
        ...tree,
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return 0.75 < (box?.height / viewportRef?.current?.getBoundingClientRect()?.height);
        },
        options: () => ({
          layout: update(layoutConfig ?? {}, {
            gap: {
              $set: {
                column: 40,
                row: 40,
              },
            },
          } as any),
        }),
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.width < viewportRef?.current?.getBoundingClientRect()?.width;
        },
        options: () => ({
          boundingBox: viewportRef?.current?.getBoundingClientRect(),
          layout: {
            direction: LayoutConfigDirectionEnum.HORIZONTAL,
          },
        }),
        type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.height < viewportRef?.current?.getBoundingClientRect()?.height;
        },
        options: () => ({
          boundingBox: viewportRef?.current?.getBoundingClientRect(),
          layout: {
            direction: LayoutConfigDirectionEnum.VERTICAL,
          },
        }),
        type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.height > viewportRef?.current?.getBoundingClientRect()?.height;
        },
        options: (rects: RectType[]) => ({
          offset: {
            top: shiftDown(0.5)(rects),
          },
        }),
        type: TransformRectTypeEnum.SHIFT,
      },
      {
        condition: (rects: RectType[]) => {
          const box = calculateBoundingBox(rects);
          return box?.width > viewportRef?.current?.getBoundingClientRect()?.width;
        },
        options: (rects: RectType[]) => ({
          offset: {
            top: shiftRight(0.5)(rects),
          },
        }),
        type: TransformRectTypeEnum.SHIFT,
      },
    ] as RectTransformationType[]);
  }

  DEBUG.layoutManager && console.log('transformers', transformers);

  return transformers;
}
