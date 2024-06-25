import grid from './layout/grid';
import tree from './layout/tree';
import update from 'immutability-helper';
import wave from './layout/wave';
import { DEBUG } from '@components/v2/utils/debug';
import {
  centerRectOnScreen,
  formatKeyValue,
  calculateBoundingBox,
  logMessageForRects,
} from './layout/shared';
import {
  DragItem,
  LayoutConfigType,
  RectType,
  RectTransformationType,
} from '../interfaces';
import {
  LayoutConfigDirectionEnum,
  TransformRectTypeEnum,
  RectTransformationScopeEnum,
} from '../types';
import { applyRectDiff, getRectDiff } from './layout/shared';
import { indexBy, deepCopyArray as deepCopy, range } from '@utils/array';
import { isDebug as isDebugBase } from '@utils/environment';
import { padString } from '@utils/string';
import { validateFiniteNumber } from '@utils/number';
import { ignoreKeys } from '@utils/hash';

function isDebug() {
  return isDebugBase() && false;
}

function deepCopyArray(rects: RectType[]): RectType[] {
  // The original deepCopyArray is expensive and takes a long time; use it wisely.
  return rects;
}

export type SetupOpts = {
  groupBy?: (item: DragItem) => string;
  layout?: LayoutConfigType;
  level?: number;
};

export function transformRects(
  rectsInit: RectType[],
  transformations: RectTransformationType[],
): RectType[] {
  const rectsByStage = [deepCopy(rectsInit)];

  transformations.forEach((transformation, stageNumber: number) => {
    const {
      condition,
      conditionSelf,
      initialRect,
      initialScope,
      options,
      scope,
      targets,
      transform,
      type,
    } = transformation;

    const rectsStart = deepCopy(rectsByStage[rectsByStage.length - 1]);
    let rects = deepCopy(rectsStart);

    const opts = options ? options?.(rects) : {};
    const {
      boundingBox,
      defaultRect,
      layout,
      offset,
      padding,
      rect: rectBase,
    } = {
      ...(opts ?? {}),
      ...(opts?.layout?.options ?? {}),
    } as any;
    const { parent } = rects?.[0] ?? {};
    const { styleOptions } = layout ?? {};
    const { rectTransformations: rectTransformationsNested } = styleOptions ?? {};

    const debugLog = (stage: string, arr1: RectType[], opts?: any) => {
      const format = (val: number) =>
        (val ?? null) !== null && !isNaN(val)
          ? padString(String(Math.round(val)), 6, ' ')
          : '     -';

      const arr = deepCopyArray(arr1).map(r => ({
        ...r,
        height: r.height ?? 0,
        left: r.left ?? 0,
        top: r.top ?? 0,
        width: r.width ?? 0,
      }));
      const rectsBox = calculateBoundingBox(arr);

      const tag = `${stageNumber}. ${type}:${stage}` + (initialScope ? ` (${initialScope})` : '');
      const tags = [
        layout,
        ignoreKeys(opts, ['boundingBox', 'layout', 'offset', 'rect']),
        ignoreKeys(transformation, ['initialScope', 'options']),
        boundingBox
          ? {
              'box.bound': [
                boundingBox.left,
                boundingBox.top,
                boundingBox.width,
                boundingBox.height,
              ]
                .map(format)
                .join(', '),
            }
          : {},
        rectsBox
          ? {
              'box.rects': [rectsBox.left, rectsBox.top, rectsBox.width, rectsBox.height]
                .map(format)
                .join(', '),
            }
          : {},
        offset
          ? {
              offset: [offset.left, offset.top, offset.width, offset.height].map(format).join(', '),
            }
          : {},
        rectBase
          ? {
              rectBase: [rectBase.left, rectBase.top, rectBase.width, rectBase.height]
                .map(format)
                .join(', '),
            }
          : {},
      ].flatMap(o => Object.entries(o ?? {}));

      const args = tags
        ?.map(([k, v]) => `|   ${formatKeyValue(k, v, 0)}`)
        ?.sort()
        ?.join('\n');

      let text = logMessageForRects(arr);

      if (initialRect) {
        text = `[parent]: ${initialRect.id}\n${text}`;
      }

      if (!DEBUG.rects) return;

      if (opts?.rectsOnly) {
        console.log(
          '| ' +
            stage +
            `\n| ${range(10)
              .map(() => '-')
              .join('')}\n` +
            text +
            `\n| ${range(10)
              .map(() => '-')
              .join('')}\n`,
        );
      } else {
        console.log(
          tag +
            `\n${range(100)
              .map(() => '-')
              .join('')}\n` +
            text +
            `\n${range(100)
              .map(() => '-')
              .join('')}\n` +
            args +
            `\n${range(100)
              .map(() => '=')
              .join('')}\n`,
        );
      }
    };

    debugLog('start', deepCopyArray(rects));

    if (targets) {
      rects = [...targets(rects)];
    }

    if (!rects?.length) {
      rectsByStage.push([...rects]);
      return rects;
    }

    if (condition && !condition(rects)) {
      rectsByStage.push([...rects]);
      debugLog('[CONDITION NOT MET]', deepCopyArray(rects));
      rectsByStage.push([...rects]);
      return rects;
    }

    let rectsSnapshot = [];
    if (conditionSelf && RectTransformationScopeEnum.CHILDREN !== scope) {
      rectsSnapshot = deepCopy(rects);
      rects = rects.filter(r => conditionSelf(r));
      debugLog(`condition_self.start: ${rects.length}/${rectsSnapshot.length}`, rects);
    }

    if (RectTransformationScopeEnum.CHILDREN === scope) {
      const arr = [];
      rects.forEach(rect => {
        let rectChildren = [...(rect.children || [])] || [];
        const count1 = rectChildren?.length;

        let rcsnap = [];
        if (conditionSelf) {
          rcsnap = deepCopy(rectChildren);
          rectChildren = rectChildren.filter(r => conditionSelf(r));
          debugLog(
            `condition_self(${rect.id}).start: ${rectChildren.length}/${rcsnap.length}`,
            rectChildren,
          );
        }

        if (rectChildren.length > 0) {
          let rc = rectChildren?.map(rectChild => ({
            ...rectChild,
            parent: rect,
          })) as RectType[];

          rc = transformRects(rc, [
            {
              ...ignoreKeys(transformation, ['condition', 'conditionSelf', 'scope']),
              initialRect: rect,
              initialScope: scope,
            },
          ]) as RectType[];

          if (conditionSelf) {
            const rcmap = indexBy(rc, r => r.id);
            const rcend = rcsnap.map(r => rcmap[r.id] ?? r);
            debugLog(`condition_self(${rect.id}).end:`, rcend);
            rect.children = rcend;
          } else {
            rect.children = rc;
          }

          if (rect.children?.length !== count1) {
            throw new Error(
              `Rect ${rect.id} started with ${count1} ` +
                `children but ended with ${rect.children?.length} children after transformation.`,
            );
          }
        }

        arr.push(rect);
      });
      rects = deepCopyArray(arr);
    } else if (RectTransformationScopeEnum.SELF === scope) {
      rects = deepCopyArray(rects)?.map(rect => ({
        ...rect,
        ...transformRects(
          [rect],
          [
            {
              ...transformation,
              scope: undefined,
            },
          ],
        )[0],
      }));
    } else if (TransformRectTypeEnum.RESET === type) {
      rects = deepCopyArray(rects).map(rect => ({
        ...rect,
        left: 0,
        top: 0,
      }));
    } else if (TransformRectTypeEnum.LAYOUT_TREE === type) {
      rects = tree.pattern1(deepCopyArray(rects), layout ?? {}, {
        // Doesn‘t work yet; the nodes are out of order in terms of its dependencies.
        ...(rectTransformationsNested
          ? {
              rectTransformations: {
                level: arr => transformRects(arr, rectTransformationsNested),
              },
            }
          : {}),
      });
    } else if (TransformRectTypeEnum.LAYOUT_WAVE === type) {
      rects = wave.pattern3(deepCopyArray(rects), layout);
    } else if (TransformRectTypeEnum.LAYOUT_GRID === type) {
      rects = grid.pattern1(deepCopyArray(rects), layout);
    } else if (TransformRectTypeEnum.LAYOUT_SPIRAL === type) {
      rects = layoutRectsInSpiral(deepCopyArray(rects), layout);
    } else if (TransformRectTypeEnum.SHIFT_INTO_PARENT === type && parent) {
      rects = shiftRectsIntoBoundingBox(deepCopyArray(rects), parent);
    } else if (TransformRectTypeEnum.ALIGN_WITHIN_VIEWPORT === type) {
      const box = calculateBoundingBox(deepCopyArray(rects));
      const xoff = boundingBox.width / 2 - box.width / 2;
      const yoff = boundingBox.height / 2 - box.height / 2;
      rects = deepCopyArray(rects).map(rect => {
        if (LayoutConfigDirectionEnum.HORIZONTAL === layout?.direction) {
          rect.left += xoff;
        } else if (LayoutConfigDirectionEnum.VERTICAL === layout?.direction) {
          rect.top += yoff;
        }
        return rect;
      });
    } else if (TransformRectTypeEnum.ALIGN_CHILDREN === type) {
      rects = deepCopyArray(rects).map(rect => {
        const { parent } = rect;
        const diff = {
          left:
            (validateFiniteNumber(parent?.offset?.left) ?? 0) +
            (validateFiniteNumber(parent?.padding?.left) ?? 0),
          top:
            (validateFiniteNumber(parent?.offset?.top) ?? 0) +
            (validateFiniteNumber(parent?.padding?.top) ?? 0),
        };

        return applyRectDiff(rect, diff);
      });
    } else if (TransformRectTypeEnum.FIT_TO_CHILDREN === type) {
      rects = deepCopyArray(rects).map(rect => {
        const box = calculateBoundingBox(rect?.children?.length >= 1 ? rect.children : [rect]);

        return {
          ...rect,
          height:
            validateFiniteNumber(box.height) +
            validateFiniteNumber(padding?.top ?? 0) +
            validateFiniteNumber(padding?.bottom ?? 0) +
            validateFiniteNumber(offset?.top ?? 0),
          offset,
          padding,
          width:
            validateFiniteNumber(box.width) +
            validateFiniteNumber(padding?.left ?? 0) +
            validateFiniteNumber(padding?.right ?? 0) +
            validateFiniteNumber(offset?.left ?? 0),
        };
      });
    } else if (TransformRectTypeEnum.FIT_TO_SELF === type) {
      rects = deepCopyArray(rects).map(rect => {
        const rectPrev = defaultRect?.(rect);
        return { ...rect, ...rectPrev };
      });
    } else if (TransformRectTypeEnum.PAD === type) {
      rects = deepCopyArray(rects).map(rect => ({ ...rect, padding }));
    } else if (TransformRectTypeEnum.SHIFT === type) {
      rects = shiftRectsByDiffRect(deepCopyArray(rects), offset ?? { left: 0, top: 0 });
    } else if (TransformRectTypeEnum.MIN_DIMENSIONS === type) {
      rects = deepCopyArray(rects).map(rect => {
        const height1 = validateFiniteNumber(rect.height);
        const width1 = validateFiniteNumber(rect.width);
        const heightd = validateFiniteNumber(rectBase?.height ?? 0);
        const widthd = validateFiniteNumber(rectBase?.width ?? 0);

        return {
          ...rect,
          height: height1 < heightd ? heightd : height1,
          width: width1 < widthd ? widthd : width1,
        };
      });
    } else if (TransformRectTypeEnum.CENTER === type) {
      if (boundingBox && rectBase) {
        rects = centerRectOnScreen(boundingBox, rectBase, deepCopyArray(rects));
      }
    } else if (transform) {
      rects = transform(deepCopyArray(rects));
    }

    if (conditionSelf && RectTransformationScopeEnum.CHILDREN !== scope) {
      const mapping = indexBy(rects, r => r.id);
      rects = rectsSnapshot.map(r => mapping[r.id] ?? r);
      debugLog('condition_self.end', rects);
    }

    const rectsStartMapping = indexBy(rectsStart, r => r.id);
    debugLog(
      'diff',
      rects.map((rend: RectType) => {
        const rstart = rectsStartMapping[rend.id];

        return {
          ...rend,
          height: rend.height - rstart.height,
          left: rend.left - rstart.left,
          top: rend.top - rstart.top,
          width: rend.width - rstart.width,
        };
      }),
      {
        rectsOnly: true,
      },
    );
    debugLog('end', rects);

    rectsByStage.push(deepCopyArray(rects));
  });

  const stage = rectsByStage.length - 1;
  const results = rectsByStage[stage];
  const rectsPrev = rectsByStage[stage - 1];

  if (rectsByStage.length >= 2) {
    deepCopyArray(results)?.forEach((rect, idx) => {
      const rectp = rectsPrev[idx];
      if (!rect?.children?.length && !rectp?.children?.length) return;

      if (rect.children?.length !== rectp.children?.length) {
        throw new Error(
          `Rect ${rect.id} started with ${rectp?.children?.length} ` +
            `children but ended with ${rect?.children?.length} children after transformation ` +
            `going from stage ${stage - 1} to stage ${stage}`,
        );
      }
    });
  }

  return results;
}

function shiftRectsIntoBoundingBox(rects: RectType[], boundingBox: RectType): RectType[] {
  // This function shifts a list of rectangles to fit within a specified bounding box.
  const groupBoundingBox = calculateBoundingBox(rects);

  const offsetX =
    validateFiniteNumber(boundingBox.left) - validateFiniteNumber(groupBoundingBox.left);
  const offsetY =
    validateFiniteNumber(boundingBox.top) - validateFiniteNumber(groupBoundingBox.top);

  return rects.map(rect => ({
    ...rect,
    left: validateFiniteNumber(rect.left) + validateFiniteNumber(offsetX),
    top: validateFiniteNumber(rect.top) + validateFiniteNumber(offsetY),
  }));
}

function shiftRectsByDiffRect(rects: RectType[], rectDiff: RectType) {
  return rects.map(rect => applyRectDiff(rect, rectDiff));
}

function addPaddingToRectInsideBox(
  rects: RectType[],
  box: RectType,
  pad: {
    bottom: number;
    left: number;
    right: number;
    top: number;
  },
) {
  return rects?.map((rect: RectType) => ({
    ...rect,
    left: Math.min(
      (box.left ?? 0) + box.width - pad.right,
      Math.max((box.left ?? 0) + pad.left, rect.left),
    ),
    top: Math.min(
      (box.top ?? 0) + box.height - pad.bottom,
      Math.max((box.top ?? 0) + pad.top, rect.top),
    ),
  }));
}

function layoutRectsInSpiral(rects: RectType[], layout?: LayoutConfigType): RectType[] {
  const { gap, direction, options } = layout || {};
  const { initialAngle = 0, angleStep = Math.PI / 8 } = options ?? {};
  const { containerRect } = getRectsFromLayout(layout || {});

  const rectsCopy = [...rects];
  const halfWidth = containerRect.width / 2;
  const halfHeight = containerRect.height / 2;

  let angle = initialAngle; // Initial angle in radians
  const stepSize = Math.max(gap?.row || gap?.column || 20); // Base increment for radius

  let radius = stepSize; // Initial radius
  const positionedRects: RectType[] = [];

  const horizontalAspectRatio = 1.5; // Moderate horizontal elongation
  const verticalAspectRatio = 1 / horizontalAspectRatio; // Moderate vertical elongation

  rectsCopy.forEach(rect => {
    let x: number;
    let y: number;
    let overlap: boolean;
    let left: number;
    let top: number;

    do {
      // Calculate the elongated position based on angle and radius
      x =
        radius *
        Math.cos(angle) *
        (direction === LayoutConfigDirectionEnum.HORIZONTAL
          ? horizontalAspectRatio
          : verticalAspectRatio);
      y =
        radius *
        Math.sin(angle) *
        (direction === LayoutConfigDirectionEnum.VERTICAL
          ? horizontalAspectRatio
          : verticalAspectRatio);

      left = Math.max(0, halfWidth + x - rect.width / 2);
      top = Math.max(0, halfHeight + y - rect.height / 2);

      overlap = positionedRects.some(
        posRect =>
          !(
            left + rect.width < posRect.left ||
            left > posRect.left + posRect.width ||
            top + rect.height < posRect.top ||
            top > posRect.top + posRect.height
          ),
      );

      if (overlap || left < 0 || top < 0) {
        // If there is overlap or the rect goes out of bounds, adjust the angle and radius
        angle += angleStep;
        radius += stepSize;
      } else {
        // Otherwise, add the rect to the positionedRects
        positionedRects.push({
          ...rect,
          left,
          top,
        });
      }
    } while (overlap);
  });

  return positionedRects;
}

function getRectsFromLayout(layout: LayoutConfigType): {
  boundingRect: DOMRect | RectType;
  containerRect: DOMRect | RectType;
} {
  const { containerRef, viewportRef } = layout || {};

  const boundingRect = viewportRef?.current?.getBoundingClientRect() ?? {
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    left: 0,
    top: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  };
  const containerRect = containerRef?.current?.getBoundingClientRect() ?? {
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    left: 0,
    top: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  };

  return {
    boundingRect,
    containerRect,
  };
}
