import BlockType from '@interfaces/BlockType';
import { DEBUG } from '@components/v2/utils/debug';
import { PADDING_VERTICAL } from '../../../Canvas/Nodes/BlockNodeV2';
import { FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { HEADER_HEIGHT } from '@context/v2/Layout/Header/index.style';
import { ItemTypeEnum, LayoutDisplayEnum, LayoutStyleEnum } from '../../../Canvas/types';
import { LayoutConfigType } from '../../../Canvas/interfaces';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import {
  RectTransformationScopeEnum,
  LayoutVerticalAlignmentEnum,
  LayoutHorizontalAlignmentEnum,
  LayoutConfigDirectionEnum,
  TransformRectTypeEnum,
} from '../../../Canvas/types';
import { RectTransformationType } from '../../../Canvas/interfaces';
import { RectType } from '@mana/shared/interfaces';
import { calculateBoundingBox } from '../../../Canvas/utils/layout/shared';
import { flattenArray } from '@utils/array';
import { validateFiniteNumber } from '@utils/number';
import { padString } from '@utils/string';

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
  const arr = blockNodes.map((bn: BlockNodeType) => {
    const { block, node, rect } = bn ?? {};

    return {
      ...rect,
      block,
      children: hydrateBlockNodeRects(
        ((block as any)?.children ?? [])?.map((b: any) => blockNodeMapping[b.uuid]),
        blockNodeMapping,
      ),
      id: block?.uuid,
      type: node?.type,
      // Handle this outside of this function
      upstream: ((block as any)?.upstream_blocks ?? [])?.map((buuid: string) => ({ id: buuid })),
    };
  });

  return arr;
}

export function buildRectTransformations({
  centerRect,
  conditionalDirections,
  disableAlignments,
  layoutConfig,
  selectedGroup,
}: {
  centerRect?: RectType;
  conditionalDirections?: boolean;
  disableAlignments?: boolean;
  layoutConfig?: LayoutConfigType;
  selectedGroup?: MenuGroupType;
}): RectTransformationType[] {
  const layoutStyle = layoutConfig?.style ?? LayoutStyleEnum.WAVE;
  const gap = {
    column: layoutConfig?.gap?.column ?? 40,
    row: layoutConfig?.gap?.row ?? 40,
  };
  const waveOptions = {
    amplitude: layoutConfig?.options?.amplitude ?? 300,
    wavelength: layoutConfig?.options?.wavelength ?? 100,
  };

  const direction = layoutConfig?.direction || LayoutConfigDirectionEnum.HORIZONTAL;
  const directionOp =
    LayoutConfigDirectionEnum.HORIZONTAL === direction
      ? LayoutConfigDirectionEnum.VERTICAL
      : LayoutConfigDirectionEnum.HORIZONTAL;
  const viewportRef = layoutConfig?.viewportRef;

  DEBUG.rects && console.log('buildRectTransformations', layoutConfig, selectedGroup);

  const shiftHorizontal =
    (factor: number = 2) =>
    (rects: RectType[]) =>
      Math.max(
        40,
        validateFiniteNumber(
          typeof window !== 'undefined'
            ? (window.innerWidth - calculateBoundingBox(rects).width) / factor
            : 0,
        ),
      );
  const shiftVertical =
    (factor: number = 2) =>
    (rects: RectType[]) =>
      Math.max(
        40,
        validateFiniteNumber(
          typeof window !== 'undefined'
            ? (window.innerHeight - calculateBoundingBox(rects).height) / factor
            : 0,
        ),
      );

  const tree = {
    options: () => ({
      layout: {
        ...(layoutConfig ?? {}),
        gap,
        options: {
          horizontalAlignment: LayoutHorizontalAlignmentEnum.CENTER,
          stagger: 40,
          verticalAlignment: LayoutVerticalAlignmentEnum.CENTER,
        },
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_TREE,
  };

  const wave = {
    options: () => ({
      layout: {
        ...(layoutConfig ?? {}),
        gap,
        options: {
          ...waveOptions,
        },
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_WAVE,
  };
  const grid = {
    options: () => ({
      layout: {
        ...(layoutConfig ?? {}),
        gap,
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_GRID,
  };
  const spiral = {
    options: () => ({
      layout: {
        ...(layoutConfig ?? {}),
        gap,
        options: { angleStep: Math.PI / 12, initialAngle: Math.PI / 6 },
      },
    }),
    type: TransformRectTypeEnum.LAYOUT_SPIRAL,
  };

  const conditionHeight = (rects: RectType[]) => {
    const box = calculateBoundingBox(rects);
    // Total height is less than 80% of the viewport height
    return 0.99 > box?.height / viewportRef?.current?.getBoundingClientRect()?.height;
  };
  const conditionWidth = (rects: RectType[]) => {
    const box = calculateBoundingBox(rects);
    // Total width is less than 80% of the viewport width
    return 0.99 > box?.width / viewportRef?.current?.getBoundingClientRect()?.width;
  };
  const conditionDimensions =
    LayoutConfigDirectionEnum.HORIZONTAL === direction ? conditionHeight : conditionWidth;
  const conditionallySwitchDirections = patterns =>
    patterns.concat(
      patterns.map(pattern => ({
        ...pattern,
        condition: (args: any) => !conditionDimensions(args),
        options: () => ({ layout: { direction: directionOp } }),
      })),
    );

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
        [LayoutStyleEnum.TREE]: [
          tree,
          {
            ...wave,
            condition: (args: any) => !conditionDimensions(args),
            options: () => ({
              layout: {
                ...(layoutConfig ?? {}),
                gap,
                options: {
                  ...waveOptions,
                },
              },
            }),
          },
        ],
        [LayoutStyleEnum.WAVE]: [
          wave,
          {
            ...tree,
            condition: (args: any) => !conditionDimensions(args),
          },
        ],
      },
    };

    const pattern = patternMapping[layoutConfig?.display]?.[layoutStyle];
    return conditionalDirections ? conditionallySwitchDirections(pattern ?? [wave]) : pattern;
  };

  const bbox = viewportRef?.current?.getBoundingClientRect()
  const boundingBox = {
    left: bbox?.left || 0,
    top: (bbox?.top || 0) + HEADER_HEIGHT,
    width: bbox?.width || 0,
    height: (bbox?.height || 0) - HEADER_HEIGHT,
  };

  const viewportAlignment = [
    {
      condition: conditionWidth,
      options: () => ({
        boundingBox,
        layout: { direction: LayoutConfigDirectionEnum.HORIZONTAL },
      }),
      type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
    },
    {
      condition: conditionHeight,
      options: () => ({
        boundingBox,
        layout: { direction: LayoutConfigDirectionEnum.VERTICAL },
      }),
      type: TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT,
    },
  ];

  if (LayoutDisplayEnum.DETAILED === layoutConfig?.display) {
    const activeGroupConditionSelf = (rect: RectType) => {
      const group = selectedGroup;
      return (!group?.uuid || rect?.block?.uuid === group?.uuid) && rect?.children?.length > 0;
    };
    const activeGroupConditionChild = (rect: RectType) => {
      const group = selectedGroup;
      return !group?.uuid || rect?.block?.groups?.includes(group?.uuid);
    };

    transformers.push(
      ...([
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
                ...flattenArray(rects?.map(rect => rect.children)).map(rect => {
                  const val =
                    (rect?.inner?.badge?.height ?? 0) +
                    (rect?.inner?.badge?.offset?.top ?? 0) +
                    (rect?.inner?.title?.height ?? 0) +
                    (rect?.inner?.title?.offset?.top ?? 0);

                  return validateFiniteNumber(val) ?? 0;
                }),
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
      ] as RectTransformationType[]),
    );

    if (!disableAlignments) {
      transformers.push(
        ...([
          ...viewportAlignment,
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
              rect.top / viewportRef?.current?.getBoundingClientRect()?.height < 0.05,
            options: (rects: RectType[]) => ({
              boundingBox,
              offset: { top: shiftVertical(0.5)(rects) },
            }),
            scope: RectTransformationScopeEnum.SELF,
            type: TransformRectTypeEnum.SHIFT,
          },
          {
            conditionSelf: (rect: RectType) =>
              // If the top of the rect is more than 95% of the viewport height
              rect.top / viewportRef?.current?.getBoundingClientRect()?.height > 0.95,
            options: (rects: RectType[]) => ({
              boundingBox,
              offset: { top: shiftVertical(-0.5)(rects) },
            }),
            scope: RectTransformationScopeEnum.SELF,
            type: TransformRectTypeEnum.SHIFT,
          },
          {
            conditionSelf: (rect: RectType) =>
              // If the left of the rect is less than 5% of the viewport width
              rect.left / viewportRef?.current?.getBoundingClientRect()?.width < 0.05,
            options: (rects: RectType[]) => ({
              boundingBox,
              offset: { left: shiftHorizontal(0.5)(rects) },
            }),
            scope: RectTransformationScopeEnum.SELF,
            type: TransformRectTypeEnum.SHIFT,
          },
          {
            conditionSelf: (rect: RectType) =>
              // If the left of the rect is more than 95% of the viewport width
              rect.left / viewportRef?.current?.getBoundingClientRect()?.width > 0.95,
            options: (rects: RectType[]) => ({
              boundingBox,
              offset: { left: shiftHorizontal(-0.5)(rects) },
            }),
            scope: RectTransformationScopeEnum.SELF,
            type: TransformRectTypeEnum.SHIFT,
          },
        ] as RectTransformationType[]),
      );
    }
  } else if (LayoutDisplayEnum.SIMPLE === layoutConfig?.display) {
    const patterns = layoutPattern();
    transformers.push(
      ...([
        ...patterns,
        // ...viewportAlignment.map(({ condition, options, ...rest }) => {
        //   // Only align if not in tree mode because tree mode already aligns its children.
        //   const { condition: condition0, options: optionsT, type } = patterns?.[0];
        //   const tdir = optionsT?.()?.layout?.direction ?? direction;

        //   const { layout: lo } = options?.() ?? {};
        //   const vpdir = lo?.direction;

        //   return {
        //     ...rest,
        //     condition: (args: any) => {
        //       let valid = !condition || condition(args);

        //       // Apply the condition if the directions are opposite
        //       if (LayoutStyleEnum.TREE === type && tdir !== vpdir) {
        //         valid = (!condition0 || condition0(args))
        //           && patterns?.slice(1, patterns?.length)?.every(
        //             (p) => !p.condition || p.condition(args));
        //       }

        //       return valid;
        //     },
        //     options,
        //   }
        // }),
      ] as RectTransformationType[]),
    );

    if (!disableAlignments) {
      transformers.push(...viewportAlignment);
    }
  }

  if (DEBUG.rects) {
    const msgs = [];
    transformers?.forEach((t, idx: number) => {
      msgs.push(`|   ${padString(String(idx), 2, ' ')}. ${t.type}`);
    });
    console.log(`transformers:\n${msgs.join('\n')}\n` + '-'.repeat(100));
  }

  transformers.push(...(layoutConfig?.rectTransformations ?? []));

  if (centerRect) {
    transformers.push({
      options: () => ({
        boundingBox,
        rect: centerRect,
      }),
      type: TransformRectTypeEnum.CENTER,
    } as RectTransformationType);
  }

  transformers.push({
    options: (rects: RectType[]) => ({
      boundingBox,
      offset: { left: PADDING_VERTICAL, top: HEADER_HEIGHT + PADDING_VERTICAL },
    }),
    scope: RectTransformationScopeEnum.SELF,
    type: TransformRectTypeEnum.SHIFT,
  })

  return transformers;
}
