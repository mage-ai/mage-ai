import grid from './layout/grid';
import tree from './layout/tree';
import update from 'immutability-helper';
import wave from './layout/wave';
import { DEBUG } from '@components/v2/utils/debug';
import { DEFAULT_LAYOUT_CONFIG, centerRectOnScreen, formatKeyValue, logMessageForRects } from './layout/shared';
import { DragItem, LayoutConfigType, NodeItemType, NodeType, RectType, RectTransformationType } from '../interfaces';
import { LayoutConfigDirectionEnum, TransformRectTypeEnum, RectTransformationScopeEnum } from '../types';
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
    } = opts ?? {};
    const { parent } = rects?.[0] ?? {};

    const debugLog = (stage: string, arr1: RectType[], opts?: any) => {
      const format = (val: number) => ((val ?? null) !== null && !isNaN(val))
        ? padString(String(Math.round(val)), 6, ' ') : '     -';

      const arr = deepCopyArray(arr1).map(r => ({
        ...r,
        height: r.height ?? 0,
        left: r.left ?? 0,
        top: r.top ?? 0,
        width: r.width ?? 0,
      }))
      const rectsBox = calculateBoundingBox(arr);

      const tag = `${stageNumber}. ${type}:${stage}` + (initialScope ? ` (${initialScope})` : '');
      const tags = [
        layout,
        ignoreKeys(opts, [
          'boundingBox',
          'layout',
          'offset',
        ]),
        ignoreKeys(transformation, [
          'initialScope',
          'options',
        ]),
        (boundingBox ? {
          'box.bound': [
            boundingBox.left,
            boundingBox.top,
            boundingBox.width,
            boundingBox.height,
          ].map(format).join(', '),
        } : {}),
        (rectsBox ? {
          'box.rects': [
            rectsBox.left,
            rectsBox.top,
            rectsBox.width,
            rectsBox.height,
          ].map(format).join(', '),
        } : {}),
        (offset ? {
          'offset': [
            offset.left,
            offset.top,
            offset.width,
            offset.height,
          ].map(format).join(', '),
        } : {}),
      ].flatMap(o => Object.entries(o ?? {}));

      const args = tags?.map(([k, v]) =>
        `|   ${formatKeyValue(k, v)}`
      )?.sort()?.join('\n');

      let text = logMessageForRects(arr);

      if (initialRect) {
        text = `[parent]: ${initialRect.id}\n${text}`;
      }

      if (!DEBUG.rects) return;

      if (opts?.rectsOnly) {
        console.log('| '
          + stage
          + `\n| ${range(10).map(() => '-').join('')}\n`
          + text
          + `\n| ${range(10).map(() => '-').join('')}\n`
        );
      } else {
        console.log(tag
          + `\n${range(100).map(() => '-').join('')}\n`
          + text
          + `\n${range(100).map(() => '-').join('')}\n`
          + args
          + `\n${range(100).map(() => '=').join('')}\n`);
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
      rects.forEach((rect) => {
        let rectChildren = [...(rect.children || [])] || [];
        const count1 = rectChildren?.length;

        let rcsnap = [];
        if (conditionSelf) {
          rcsnap = deepCopy(rectChildren);
          rectChildren = rectChildren.filter(r => conditionSelf(r));
          debugLog(`condition_self(${rect.id}).start: ${rectChildren.length}/${rcsnap.length}`, rectChildren);
        }

        if (rectChildren.length > 0) {
          let rc = rectChildren?.map(rectChild => ({
            ...rectChild,
            parent: rect,
          })) as RectType[];

          rc = transformRects(rc, [{
            ...ignoreKeys(transformation, [
              'condition', 'conditionSelf', 'scope',
            ]),
            initialRect: rect,
            initialScope: scope,
          }]) as RectType[];

          if (conditionSelf) {
            const rcmap = indexBy(rc, r => r.id);
            const rcend = rcsnap.map(r => rcmap[r.id] ?? r);
            debugLog(`condition_self(${rect.id}).end:`, rcend);
            rect.children = rcend
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
      rects = deepCopyArray(rects)?.map((rect) => ({
        ...rect,
        ...transformRects([rect], [{
          ...transformation,
          scope: undefined,
        }])[0],
      }));
    } else if (TransformRectTypeEnum.RESET === type) {
      rects = deepCopyArray(rects).map((rect) => ({
        ...rect,
        left: 0,
        top: 0,
      }));
    } else if (TransformRectTypeEnum.LAYOUT_TREE === type) {
      rects = tree.pattern1(deepCopyArray(rects), layout ?? {}, {
        // Doesn‘t work yet; the nodes are out of order in terms of its dependencies.
        // patterns: {
        //   level: arr => wave.pattern3(deepCopyArray(arr), {
        //     ...layout,
        //     direction: LayoutConfigDirectionEnum.VERTICAL === layout?.direction
        //       ? LayoutConfigDirectionEnum.HORIZONTAL
        //       : LayoutConfigDirectionEnum.VERTICAL,
        //   }),
        // },
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
      const xoff = (boundingBox.width / 2) - (box.width / 2);
      const yoff = (boundingBox.height / 2) - (box.height / 2);
      rects = deepCopyArray(rects).map(rect => {
        if (LayoutConfigDirectionEnum.HORIZONTAL === layout?.direction) {
          rect.left += xoff;
        } else if (LayoutConfigDirectionEnum.VERTICAL === layout?.direction) {
          rect.top += yoff;
        }
        return rect;
      });
    } else if (TransformRectTypeEnum.ALIGN_CHILDREN === type) {
      rects = deepCopyArray(rects).map((rect) => {
        const { parent } = rect;
        const diff = {
          left: (validateFiniteNumber(parent?.offset?.left) ?? 0)
            + (validateFiniteNumber(parent?.padding?.left) ?? 0),
          top: (validateFiniteNumber(parent?.offset?.top) ?? 0)
            + (validateFiniteNumber(parent?.padding?.top) ?? 0),
        };

        return applyRectDiff(rect, diff);
      });
    } else if (TransformRectTypeEnum.FIT_TO_CHILDREN === type) {
      rects = deepCopyArray(rects).map((rect) => {
        const box = calculateBoundingBox(rect?.children?.length >= 1 ? rect.children : [rect]);

        return {
          ...rect,
          height: validateFiniteNumber(box.height)
            + validateFiniteNumber(padding?.top ?? 0)
            + validateFiniteNumber(padding?.bottom ?? 0)
            + validateFiniteNumber(offset?.top ?? 0),
          offset,
          padding,
          width: validateFiniteNumber(box.width)
            + validateFiniteNumber(padding?.left ?? 0)
            + validateFiniteNumber(padding?.right ?? 0)
            + validateFiniteNumber(offset?.left ?? 0),
        };
      });
    } else if (TransformRectTypeEnum.FIT_TO_SELF === type) {
      rects = deepCopyArray(rects).map((rect) => {
        const rectPrev = defaultRect?.(rect);
        return ({ ...rect, ...rectPrev });
      });
    } else if (TransformRectTypeEnum.PAD === type) {
      rects = deepCopyArray(rects).map((rect) => ({ ...rect, padding }));
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

  const offsetX = validateFiniteNumber(boundingBox.left) - validateFiniteNumber(groupBoundingBox.left);
  const offsetY = validateFiniteNumber(boundingBox.top) - validateFiniteNumber(groupBoundingBox.top);

  return rects.map(rect => ({
    ...rect,
    left: validateFiniteNumber(rect.left) + validateFiniteNumber(offsetX),
    top: validateFiniteNumber(rect.top) + validateFiniteNumber(offsetY),
  }));
}

export function layoutRectsInContainer(rects: RectType[], layout?: LayoutConfigType): RectType[] {
  // This function lays out items within a container by centering them.
  const { height, width } = getRectsFromLayout(layout)?.containerRect || { height: 0, width: 0 };
  const rect = calculateBoundingBox(rects);
  const maxLeft = rect.left + rect.width;
  const maxTop = rect.top + rect.height;
  const offsetX = (width - (maxLeft - rect.left)) / 2;
  const offsetY = (height - (maxTop - rect.top)) / 2;

  return rects.map((rect: RectType) => ({
    ...rect,
    left: rect.left + offsetX,
    top: rect.top + offsetY,
  }));
}

function centerRects(
  rects: RectType[],
  boundingRect: RectType,
  containerRect: RectType,
): RectType[] {
  const centerRect = {
    left: (containerRect.left + containerRect.width) / 2 + (boundingRect.width ?? 0) / 2,
    top: (containerRect.top + containerRect.height) / 2 + (boundingRect.height ?? 0) / 2,
  };
  const centroid = calculateBoundingBox(rects);
  const diff = getRectDiff(centroid, centerRect);

  return rects.map(rect => applyRectDiff(rect, diff));
}

export function setUpstreamRectsForItems(items: DragItem[]): DragItem[] {
  isDebug() && console.log('setUpstreamRectsForItems', items);
  const rectsByItemID = indexBy(
    items.map(({ id, rect }) => ({ ...rect, id })),
    ({ id }) => id,
  );

  return items?.map((item: DragItem) => ({
    ...item,
    rect: {
      ...item.rect,
      id: item.id,
      upstream:
        item?.block?.upstream_blocks.reduce(
          (acc: RectType[], id: string) => acc.concat(rectsByItemID[id] ?? []),
          [],
        ) ?? [],
    },
  }));
}

export function layoutItemsInTreeFormation(
  items: DragItem[],
  layout?: LayoutConfigType,
): DragItem[] {
  const { boundingRect, containerRect } = getRectsFromLayout(layout || {});

  const items2 = setUpstreamRectsForItems(items);
  let rects = items2.map(({ rect }) => rect);
  rects = layoutRectsInTreeFormation(rects, layout);

  if (containerRect && boundingRect) {
    // Very important or it’ll appear offscreen
    rects = centerRects(rects, boundingRect, containerRect);
  }

  const rectsMapping = indexBy(rects, ({ id }) => id);
  return items2.map((item: DragItem) => ({
    ...item,
    rect: rectsMapping[item.id],
  }));
}

function layoutItemsInNodeGroup(nodes: NodeType[], layout: LayoutConfigType) {
  const groupsMapping: Record<string, NodeType> = {};

  const {
    node: transformRect = (rect: RectType) => ({ ...rect }) as RectType,
  } = layout?.transformRect || {};
  const {
    item: defaultRect = (item: NodeItemType) => ({ ...item?.rect }) as RectType,
  } = layout?.defaultRect || {};

  nodes?.forEach((node: NodeType) => {
    const { items = [] } = node;

    const layoutInner = {
      ...layout,
      direction:
        LayoutConfigDirectionEnum.HORIZONTAL === layout.direction
          ? LayoutConfigDirectionEnum.VERTICAL
          : LayoutConfigDirectionEnum.HORIZONTAL,
    };
    const items2 = layoutItemsInTreeFormation(items, layoutInner);

    const offsetTopMax =
      items2?.length >= 1
        ? Math.max(
          ...items2.map(
            (item: DragItem) =>
              (item?.rect?.inner?.badge?.height ?? 0) +
              (item?.rect?.inner?.badge?.offset?.top ?? 0) +
              (item?.rect?.inner?.title?.height ?? 0) +
              (item?.rect?.inner?.title?.offset?.top ?? 0),
          ),
        )
        : 0;
    const offsetLeftMax =
      items2?.length >= 1
        ? Math.max(
          ...items2.map((item: DragItem) =>
            Math.max(
              item?.rect?.inner?.badge?.offset?.left ?? 0,
              item?.rect?.inner?.title?.offset?.left ?? 0,
            ),
          ),
        )
        : 0;

    false && isDebugBase() && console.log(items2, offsetTopMax, offsetLeftMax);

    const rectNode = addRects(defaultRect(node), transformRect(node?.rect) ?? ({} as RectType));

    const rectPadding = rectNode?.padding;
    const box1 = calculateBoundingBox(items2.map((item: DragItem) => item.rect));
    const box2 = {
      ...box1,
      height: Math.max(
        box1.height + (rectPadding?.top ?? 0) + (rectPadding?.bottom ?? 0) + (offsetTopMax ?? 0),
        defaultRect(node).height,
      ),
      offset: {
        left: offsetLeftMax,
        top: offsetTopMax,
      },
      padding: rectPadding,
      width: Math.max(
        box1.width + (rectPadding?.left ?? 0) + (rectPadding?.right ?? 0),
        defaultRect(node).width,
      ),
    };

    isDebug() &&
      console.log(
        node.id,
        'offsetTopMax',
        offsetTopMax,
        'items2',
        items2,
        'rectNode',
        rectNode,
        'itemsBox',
        box1,
        'itemsBoxPadding',
        box2,
      );

    groupsMapping[node.id] = {
      ...node,
      items: items2,
      rect: box2,
    };
  });

  return Object.values(groupsMapping || {});
}

function convertUpstreamNodesToUpstreamRects(nodes: NodeItemType[]) {
  const groupsMapping = indexBy(nodes, node => node.id);

  return Object.values(groupsMapping || {}).map((node: NodeType) => ({
    ...node,
    rect: {
      ...node?.rect,
      upstream: (node.upstream ?? []).reduce((acc: RectType[], nodeID: string) => {
        const rect = groupsMapping[nodeID]?.rect;
        return rect ? acc.concat({ ...rect, id: nodeID }) : acc;
      }, []),
    },
  }));
}

function convertItemsToRects(items: NodeItemType[]): RectType[] {
  return items?.map((item: NodeItemType) => ({
    ...item.rect,
    id: item?.id,
    upstream: item?.rect?.upstream?.map((rect: RectType) => rect),
  }));
}

function clearnPositionsForRects(rects: RectType[]) {
  // Reset position to nothing; clean state.
  return rects?.map((rect: RectType) => ({
    ...rect,
    left: null,
    top: null,
    upstream: rect?.upstream?.map((rect: RectType) => ({
      ...rect,
      left: null,
      top: null,
    })),
  }));
}

function centerRectsInBoundingBox(rects: RectType[], box: RectType): RectType[] {
  const boxSmall = calculateBoundingBox(rects);

  const offsetTop = (box.height - boxSmall.height) / 2;
  const offsetLeft = (box.width - boxSmall.width) / 2;
  console.log(box, boxSmall, offsetTop, offsetLeft);
  return rects.map(rect => applyRectDiff(rect, {
    left: offsetLeft,
    top: offsetTop,
  }));
}

function shiftRectsByDiffRect(rects: RectType[], rectDiff: RectType) {
  return rects.map(rect => applyRectDiff(rect, rectDiff));
}

function addPaddingToRectInsideBox(rects: RectType[], box: RectType, pad: {
  bottom: number;
  left: number;
  right: number;
  top: number;
}) {
  return rects?.map((rect: RectType) => ({
    ...rect,
    left: Math.min(
      ((box.left ?? 0) + box.width) - pad.right,
      Math.max((box.left ?? 0) + pad.left, rect.left),
    ),
    top: Math.min(
      ((box.top ?? 0) + box.height) - pad.bottom,
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

  rectsCopy.forEach((rect) => {
    let x: number;
    let y: number;
    let overlap: boolean;
    let left: number;
    let top: number;

    do {
      // Calculate the elongated position based on angle and radius
      x = radius * Math.cos(angle) * (direction === LayoutConfigDirectionEnum.HORIZONTAL ? horizontalAspectRatio : verticalAspectRatio);
      y = radius * Math.sin(angle) * (direction === LayoutConfigDirectionEnum.VERTICAL ? horizontalAspectRatio : verticalAspectRatio);

      left = Math.max(0, halfWidth + x - rect.width / 2);
      top = Math.max(0, halfHeight + y - rect.height / 2);

      overlap = positionedRects.some((posRect) => {
        return !(left + rect.width < posRect.left || left > posRect.left + posRect.width || top + rect.height < posRect.top || top > posRect.top + posRect.height);
      });

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

function moveItemsIntoNode(node) {
  const rects = shiftRectsIntoBoundingBox(node.items.map(i => i.rect), node.rect);
  return {
    ...node,
    items: rects.map((rect, idx) => ({ ...node.items[idx], rect })),
  };
}

function alignItemsInsideNode(node) {
  const diff = {
    left: (node.rect?.offset?.left ?? 0) + (node.rect?.padding?.left ?? 0),
    top: (node.rect?.offset?.top ?? 0) + (node.rect?.padding?.top ?? 0),
  };
  return {
    ...node,
    items: node.items.map(item => ({
      ...item,
      rect: applyRectDiff({ ...item.rect }, diff),
    })),
  };
}

export function layoutItemsInGroups(nodes: NodeType[], layout: LayoutConfigType): NodeType[] {
  const {
    // offsetRectFinal,
    // padRect,
    // shiftRect,
  } = layout;
  const { boundingRect, containerRect } = getRectsFromLayout(layout);

  let nodes2 = layoutItemsInNodeGroup(nodes, layout);
  nodes2 = convertUpstreamNodesToUpstreamRects(nodes2);
  let rects2 = convertItemsToRects(nodes2);

  // Doesn’t look good when there are too few groups and they have little dependency on each other
  rects2 = layoutRectsInTreeFormation(rects2, layout);
  // rects2 = layoutRectsInWavePattern(rects2, layout); // Best for low count
  // rects2 = centerRectsInBoundingBox(rects2, boundingRect); // Centers a lot
  // rects2 = shiftRectsByDiffRect(rects2, shiftRect); // Centers a lot
  // rects2 = addPaddingToRectInsideBox(rects2, boundingRect, padRect);
  // rects2 = groupRectangles(rects2); // Places them tightly together side by side
  // rects2 = layoutRectsInGrid(rects2, layout); // Same as group rectangles
  // rects2 = layoutRectsInSpiral(rects2, layout);

  const node3: NodeType[] = rects2.map((rect: RectType, idx1) => {
    const node = nodes2[idx1];

    // Move into parent
    node.items = moveItemsIntoNode({ ...node, rect }).items;

    // Align within parent
    node.items = alignItemsInsideNode(node).items;

    return {
      ...node,
      items: node.items?.map((item: DragItem) => ({
        ...item,
        node: {
          ...node,
          items: node.items?.map(() => ({
            id: item?.id,
            rect: item?.rect,
          })),
        },
      })),
      rect,
      // rect: applyRectDiff(rect, offsetRectFinal ?? {}),
    } as NodeType;
  });

  return node3;
}

function updateItemRect(item: DragItem, rect: RectType) {
  return update(item, {
    rect: {
      $merge: rect,
    },
  });
}

export function calculateBoundingBox(rects: RectType[]): RectType {
  if (rects.length === 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const minLeft = Math.min(...rects.map(rect => validateFiniteNumber(rect.left)));
  const minTop = Math.min(...rects.map(rect => validateFiniteNumber(rect.top)));
  const maxRight = Math.max(...rects.map(rect => validateFiniteNumber(rect.left) + (validateFiniteNumber(rect.width) ?? 0)));
  const maxBottom = Math.max(...rects.map(rect => validateFiniteNumber(rect.top) + (validateFiniteNumber(rect.height) ?? 0)));

  const width = validateFiniteNumber(maxRight - minLeft);
  const height = validateFiniteNumber(maxBottom - minTop);

  return {
    height: validateFiniteNumber(height),
    left: validateFiniteNumber(minLeft),
    top: validateFiniteNumber(minTop),
    width: validateFiniteNumber(width),
  };
}

export function addRects(rect1: RectType, rect2: RectType): RectType {
  return {
    ...rect1,
    left: rect1.left + rect2.left,
    top: rect1.top + rect2.top,
  };
}

// export function getElementPositionInContainer(viewportRect, containerRect, initialElementRect) {
//   // Calculate the offset of the viewport within the container
//   const viewportOffsetX = viewportRect.left - containerRect.left;
//   const viewportOffsetY = viewportRect.top - containerRect.top;

//   // Calculate the absolute position of the element within the container
//   const elementXInContainer = initialElementRect.left + viewportOffsetX;
//   const elementYInContainer = initialElementRect.top + viewportOffsetY;

//   return {
//     left: elementXInContainer,
//     top: elementYInContainer,
//     width: initialElementRect.width,
//     height: initialElementRect.height,
//     offset: {
//       left: initialElementRect.left - viewportRect.left,
//       top: initialElementRect.top - viewportRect.top,
//     },
//   };
// }

export function getElementPositionInContainer(
  viewport: RectType,
  container: RectType,
  element: RectType,
): RectType {
  const containerOffsetLeft = container.left - viewport.left;
  const containerOffsetTop = container.top - viewport.top;

  const elementOffsetLeft = element.left - container.left;
  const elementOffsetTop = element.top - container.top;

  const absoluteLeft = containerOffsetLeft + elementOffsetLeft;
  const absoluteTop = containerOffsetTop + elementOffsetTop;

  return {
    height: element.height,
    left: absoluteLeft,
    offset: {
      left: elementOffsetLeft,
      top: elementOffsetTop,
    },
    top: absoluteTop,
    width: element.width,
  };
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

export function findRectAtPoint(x, y, rects) {
  return rects.find(({ left, top, width, height }) => x >= left && x <= left + width && y >= top && y <= top + height);
}

function layoutRectsInGrid(
  rects: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    align?: {
      horizontal?: 'left' | 'center' | 'right';
      vertical?: 'top' | 'center' | 'bottom';
    };
  }
): RectType[] {
  const { gap, direction = LayoutConfigDirectionEnum.HORIZONTAL } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };
  const { column: gapCol, row: gapRow } = gap;
  const { containerRect } = getRectsFromLayout(layout || {});

  const determinedLevels: Map<number | string, number> = new Map();
  const childrenMapping: Map<RectType, RectType[]> = new Map();
  const maxLevelWidths: Map<number, number> = new Map();
  const maxLevelHeights: Map<number, number> = new Map();
  const visited = new Set<number | string>();

  // Determine the levels for each item
  function determineLevel(item: RectType): number {
    if (determinedLevels.has(item.id)) {
      return determinedLevels.get(item.id);
    }
    if (visited.has(item.id)) {
      throw new Error(`Cycle detected involving item id ${item.id}`);
    }
    visited.add(item.id);

    if (item.upstream.length === 0) {
      determinedLevels.set(item.id, 0);
    } else {
      const level = Math.max(
        ...item.upstream.map((rect) => {
          const parentItem = rects.find((i) => i.id === rect.id);
          if (parentItem) {
            const parentLevel = determineLevel(parentItem);
            const children = childrenMapping.get(parentItem) || [];
            children.push(item);
            childrenMapping.set(parentItem, children);
            return parentLevel + 1;
          }
          return 0;
        })
      );
      determinedLevels.set(item.id, level);
    }
    visited.delete(item.id);
    return determinedLevels.get(item.id);
  }

  rects.forEach(determineLevel);

  // Group items by levels
  const levelGroups: Map<number, RectType[]> = new Map();
  rects.forEach((item) => {
    const level = determinedLevels.get(item.id);
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level).push(item);

    if (!maxLevelWidths.has(level)) {
      maxLevelWidths.set(level, 0);
      maxLevelHeights.set(level, 0);
    }

    // Track maximum dimensions at each level for alignment calculations
    maxLevelWidths.set(level, Math.max(maxLevelWidths.get(level), item.width));
    maxLevelHeights.set(level, Math.max(maxLevelHeights.get(level), item.height));
  });

  const isHorizontal = direction === LayoutConfigDirectionEnum.HORIZONTAL;
  const positionedRects: RectType[] = [];

  // Position items level by level
  let currentX = 0;
  let currentY = 0;

  levelGroups.forEach((rectsAtLevel: RectType[], level: number) => {
    // Reset current position for each level
    if (isHorizontal) {
      if (level > 0) {
        currentY += maxLevelHeights.get(level - 1) + gapRow;
      }
      currentX = 0; // start new row
    } else {
      if (level > 0) {
        currentX += maxLevelWidths.get(level - 1) + gapCol;
      }
      currentY = 0; // start new column
    }

    rectsAtLevel.forEach((rect, idx) => {
      if (isHorizontal) {
        if (currentX + rect.width > containerRect.width) {
          currentX = 0;
          currentY += maxLevelHeights.get(level) + gapRow;
        }

        positionedRects.push({
          ...rect,
          left: currentX,
          top: currentY,
        });

        currentX += rect.width + gapCol;
      } else {
        if (currentY + rect.height > containerRect.height) {
          currentY = 0;
          currentX += maxLevelWidths.get(level) + gapCol;
        }

        positionedRects.push({
          ...rect,
          left: currentX,
          top: currentY,
        });

        currentY += rect.height + gapRow;
      }
    });
  });

  // Compute bounding box for alignment adjustments
  const finalBoundingBox = calculateBoundingBox(positionedRects);
  const offsetX = opts?.align?.horizontal ? finalBoundingBox.left - finalBoundingBox.width / 2 : 0;
  const offsetY = opts?.align?.vertical ? finalBoundingBox.top - finalBoundingBox.height / 2 : 0;

  return positionedRects.map((rect: RectType) => ({
    ...rect,
    left: rect.left - offsetX,
    top: rect.top - offsetY,
  }));
}
