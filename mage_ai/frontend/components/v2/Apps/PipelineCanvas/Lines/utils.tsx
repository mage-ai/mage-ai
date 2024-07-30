import React, {
  createRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BADGE_HEIGHT, PADDING_VERTICAL } from '../../../Canvas/Nodes/BlockNodeV2';
import { getUpDownstreamColors } from '../../../Canvas/Nodes/Blocks/utils';
import stylesPipelineBuilder from '@styles/scss/apps/Canvas/Pipelines/Builder.module.scss';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { ModelContext } from '../ModelManager/ModelContext';
import { cubicBezier, motion, useAnimation, useAnimate } from 'framer-motion';
import { SettingsContext } from '../SettingsManager/SettingsContext';
import useAppEventsHandler, { CustomAppEvent, CustomAppEventEnum } from '../useAppEventsHandler';
import {
  ConnectionLines,
  LinePathType,
  linePathKey,
} from '../../../Canvas/Connections/ConnectionLines';
import {
  LayoutStyleEnum,
  ItemStatusEnum,
  LayoutDisplayEnum,
  LayoutConfigDirectionEnum,
  ItemTypeEnum,
} from '../../../Canvas/types';
import { LayoutConfigType, RectType, OutputNodeType, BlocksByGroupType, BlockMappingType, GroupMappingType } from '@components/v2/Canvas/interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import { getPathD, parsePathD } from '../../../Canvas/Connections/utils';
import { indexBy, sortByKey, unique, uniqueArray } from '@utils/array';
import { BlockTypeEnum } from '@interfaces/BlockType';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { LayoutManagerType } from '../interfaces';
import { LINE_CLASS_NAME } from '../utils/display';
import { DEBUG } from '../../../utils/debug';
import { deepCopy, ignoreKeys, objectSize, selectKeys } from '@utils/hash';
import { calculateBoundingBox } from '@components/v2/Canvas/utils/layout/shared';
import { FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import Loading from '@mana/components/Loading';

export function getLineID(upstream: string, downstream: string) {
  return [upstream, downstream].join('->');
}

export type LinePreparationOptionsType = {
  blocksByGroup?: BlocksByGroupType;
  blockMapping?: BlockMappingType;
  groupMapping?: GroupMappingType;
  direction?: LayoutConfigType['direction'];
  display?: LayoutConfigType['display'];
  style?: LayoutConfigType['style'];
};

export function prepareLinePathProps(
  rectup: RectType,
  rectdn: RectType,
  opts?: LinePreparationOptionsType,
) {
  const { blocksByGroup, blockMapping, groupMapping } = opts ?? {};
  const lineID = getLineID(rectup.id, rectdn.id);
  // console.log(lineID, rectup, rectdn, opts)

  const { block } = rectup;
  const { block: block2 } = rectdn;
  const isOutput = ItemTypeEnum.OUTPUT === rectdn?.type;

  let colors = [];

  if (isOutput) {
    colors.push('greenmd');
  } else {
    [block, block2]?.forEach(b => {
      const color = getBlockColor((b as any)?.type ?? BlockTypeEnum.GROUP, {
        getColorName: true,
      })?.names?.base;

      if (
        (!color || colors.includes(color)) &&
        (BlockTypeEnum.GROUP === block2?.type || !block2?.type)
      ) {
        const { downstreamInGroup, upstreamInGroup } = getUpDownstreamColors(
          block,
          [],
          blocksByGroup,
          {
            blockMapping,
            groupMapping,
          },
        );
        colors.push(...(downstreamInGroup?.map(g => g.colorName) ?? []));
      } else if (color && !colors.includes(color)) {
        colors.push(color);
      }
    });
  }

  colors = uniqueArray(colors);

  const fromRect = {
    ...deepCopy(rectup),
    offset: {
      x: 0,
      y: 0,
    },
  };
  const toRect = {
    ...deepCopy(rectdn),
    offset: {
      x: 0,
      y: 0,
    },
  };

  const positions = {
    [LayoutConfigDirectionEnum.VERTICAL]: ['bottom', 'top'],
    [LayoutConfigDirectionEnum.HORIZONTAL]: ['right', 'left'],
  };

  let frpos = null;
  let topos = null;

  // Determine relative positions dynamically
  // if downstream rect’s left is completely on the right side
  if (rectdn.left > rectup.left + rectup.width) {
    // positions[LayoutConfigDirectionEnum.HORIZONTAL][1] = 'left';
    frpos = 'right';
    topos = 'left';

    fromRect.offset.x = -PADDING_VERTICAL;
    toRect.offset.x = PADDING_VERTICAL;
  } else {
    frpos = 'left';
    topos = 'right';

    fromRect.offset.x = PADDING_VERTICAL;
    toRect.offset.x = -PADDING_VERTICAL;
  }

  if (rectdn.top < rectup.top) {
    // rectdn is above rect
    // positions[LayoutConfigDirectionEnum.VERTICAL] = ['top', 'bottom'];
    // positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['right', 'bottom'];
    if (!topos) {
      topos = 'bottom';
      toRect.offset.y = -PADDING_VERTICAL;
    }

    if (rectdn.top + rectdn.height < rectup.top) {
      // rectdn is completely above rectup
      frpos = 'top';
      topos = 'bottom';
      fromRect.offset.y = PADDING_VERTICAL;
      toRect.offset.y = -PADDING_VERTICAL;
    }
  } else if (rectdn.top > rectup.top) {
    // rectdn is below rect
    // positions[LayoutConfigDirectionEnum.VERTICAL] = ['bottom', 'top'];
    // positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['right', 'top'];
    if (!topos) {
      topos = 'top';
      toRect.offset.y = PADDING_VERTICAL;
    }

    // if downstream rect’s left is within the upstream’s left and right
    // if (rectdn.left > rectup.left && rectdn.left < rectup.left + rectup.width) {
    //   positions[LayoutConfigDirectionEnum.VERTICAL][1] = 'left';
    // }

    // if (rectdn.left > rectup.left + rectup.width) {
    //   positions[LayoutConfigDirectionEnum.HORIZONTAL][1] = 'left';
    // }

    if (rectdn.top > rectup.top + rectup.height) {
      // rectdn is completely below rectup
      frpos = 'bottom';
      topos = 'top';
      fromRect.offset.y = -PADDING_VERTICAL;
      toRect.offset.y = PADDING_VERTICAL;
    }
  }

  // if (ItemTypeEnum.OUTPUT === rectdn.type) {
  //   topos = 'top';
  //   toRect.offset.y = PADDING_VERTICAL;
  //   toRect.offset.x = -toRect.width / 2 + PADDING_VERTICAL;
  // }

  // if (rectdn.left < rectup.left) {
  //   // rectdn is to the left of rect
  //   positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['left', 'right'];
  // } else if (rectdn.left > rectup.left) {
  //   // rectdn is to the right of rect
  //   positions[LayoutConfigDirectionEnum.HORIZONTAL] = ['right', 'left'];
  // }

  // const layoutConfig = getLayoutConfig();
  // const {
  //   direction,
  //   display,
  //   style,
  // } = {
  //   ...layoutConfig,
  //   ...opts,
  // };
  // const [fromPosition, toPosition] = positions[direction];

  const pathDOpts = {
    // curveControl: isOutput ? 0.5 : 0,
    curveControl: 0,
    fromPosition: frpos,
    toPosition: topos,
  } as any;
  const dvalue = getPathD(pathDOpts, fromRect, toRect);

  return {
    colors,
    dvalue,
    fromRect,
    isOutput,
    lineID,
    toRect,
  };
}

export function buildPaths(
  rectup: RectType,
  rectdn: RectType,
  index: number,
  opts?: {
    animate?: any;
    lineRef?: React.MutableRefObject<SVGPathElement>;
    lineBackgroundRef?: React.MutableRefObject<SVGPathElement>;
    blocksByGroup?: LinePreparationOptionsType['blocksByGroup'];
    blockMapping?: LinePreparationOptionsType['blockMapping'];
    groupMapping?: LinePreparationOptionsType['groupMapping'];
    layout?: {
      direction?: LayoutConfigType['direction'];
      display?: LayoutConfigType['display'];
      style?: LayoutConfigType['style'];
    };
    lineRefs?: React.MutableRefObject<Record<ItemTypeEnum, Record<string, React.MutableRefObject<SVGPathElement>>>>;
    onContextMenu?: (event: any, lineID: string, foreignObjectRef: React.MutableRefObject<any>) => void;
    shouldAnimate?: (rectup: RectType, rectdn: RectType) => boolean;
    visibleByDefault?: boolean;
  },
): LinePathType {
  const paths = [];
  const { lineRefs } = opts ?? {};

  const { colors, dvalue, fromRect, isOutput, lineID, toRect } = prepareLinePathProps(
    rectup,
    rectdn,
    {
      ...opts?.layout,
      blocksByGroup: opts?.blocksByGroup,
      blockMapping: opts?.blockMapping,
      groupMapping: opts?.groupMapping,
    },
  );

  // console.log(lineID, fromRect?.left, fromRect?.top, toRect?.left, toRect?.top)

  const gradientID = `${lineID}-grad`;
  const defs = [];

  if (colors?.length >= 2) {
    defs.push(
      <defs
        dangerouslySetInnerHTML={{
          __html: `
            <linearGradient id="${gradientID}" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" style="stop-color: var(--colors-${colors[1]}); stop-opacity: 1" />
              <stop offset="100%" style="stop-color: var(--colors-${colors[0]}); stop-opacity: 1" />
            </linearGradient>
          `,
        }}
        key={`${gradientID}-defs`}
      />
    );
  }

  let lineRef = opts?.lineRef;
  let lineBackgroundRef = opts?.lineBackgroundRef;

  if (lineRefs?.current) {
    lineRefs.current[rectdn?.id] ||= {};
    let lineRef = lineRefs.current[rectdn?.id][rectup?.id]?.ref;
    let lineBackgroundRef = lineRefs.current[rectdn?.id][rectup?.id]?.backgroundRef;

    if (!lineRef) {
      lineRef = createRef();
      lineRefs.current[rectdn.id][rectup.id] = {
        from: null,
        id: null,
        ref: null,
        to: null,
      };
    }

    lineRefs.current[rectdn.id][rectup.id].from = rectup;
    lineRefs.current[rectdn.id][rectup.id].id = lineID;
    lineRefs.current[rectdn.id][rectup.id].ref = lineRef;
    lineRefs.current[rectdn.id][rectup.id].to = rectdn;

    if (!lineBackgroundRef) {
      lineBackgroundRef = createRef();
      lineRefs.current[rectdn.id][rectup.id].backgroundRef = lineBackgroundRef;
    }

    if (lineRef?.current) {
      lineRef?.current?.classList?.remove(stylesPipelineBuilder.exit);
    }
  }


  const shouldAnimate = opts?.shouldAnimate && opts?.shouldAnimate?.(rectup, rectdn);
  // console.log(rectup, rectdn, shouldAnimate, opts);

  const pathProps = {
    animate: opts?.animate,
    custom: {
      animate: shouldAnimate,
      from: rectup,
      index,
      isOutput,
      to: rectdn,
    },
    d: dvalue,
    style: {
      fill: 'none',
      // stroke: colors?.length >= 2 ? `url(#${gradientID})` : `var(--colors-${colors[0] ?? 'gray'})`,
      stroke: `var(--colors-${colors[0] ?? 'azure'})`,
      strokeWidth: isOutput ? 2 : 1.5,
    },
    'data-index': index,
  };

  paths.push(
    <motion.path
      {...pathProps}
      className={[
        stylesPipelineBuilder.path,
        stylesPipelineBuilder.background,
        stylesPipelineBuilder[`${rectup.type}-${rectdn.type}`],
      ].join(' ')}
      id={`${lineID}-background`}
      key={`${lineID}-background`}
      ref={lineBackgroundRef}
      // transition={{ ease: EASING }}
    />
  );

  paths.push(
    <motion.path
      {...pathProps}
      className={[
        stylesPipelineBuilder.path,
        stylesPipelineBuilder.line,
        stylesPipelineBuilder[`${rectup.type}-${rectdn.type}`],
      ].join(' ')}
      id={lineID}
      initial={opts?.visibleByDefault ? false : {
        opacity: 0,
        pathLength: 0,
      }}
      key={lineID}
      ref={lineRef}
      // transition={{ ease: EASING }}
    />,
  );

  // Must go last so that it’s placed over the line path.
  if (opts?.onContextMenu) {
    // From is on the left side
    const [startX, endX] = fromRect.left + fromRect.width < toRect.left + toRect.width
      ? [fromRect.left + fromRect.width, toRect.left]
      // From is on the right side
      : [toRect.left + toRect.width, fromRect.left];

    // From is on the top side
    const [startY, endY] = fromRect.top + fromRect.height < toRect.top + toRect.height
      ? [fromRect.top + fromRect.height, toRect.top]
      // From is on the bottom side
      : [toRect.top + toRect.height, fromRect.top];

    const rectDims = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      height: Math.abs(startY - endY),
      width: Math.abs(startX - endX),
    };


    const foRef = createRef();
    paths.push(
      <rect
        {...rectDims}
        className={[
          stylesPipelineBuilder.pathContextMenuOverlay,
        ].join(' ')}
        key={`${lineID}-context-menu-overlay`}
        onContextMenu={opts?.onContextMenu ? event => opts?.onContextMenu?.(event, lineID, foRef) : undefined}
        fill="transparent"
        stroke="transparent"
      />
    );

    const {
      startX: startX2,
      startY: startY2,
      endX: endX2,
      endY: endY2,
    } = parsePathD(pathProps.d);
    const foDims = {
      x: Math.min(startX2, endX2),
      y: Math.min(startY2, endY2),
      height: Math.abs(startY2 - endY2),
      width: Math.abs(startX2 - endX2),
    };

    if (foDims.height < 14) {
      const yoff = 14 - foDims.height;
      foDims.height = 14;
      foDims.y -= (yoff / 2);
    }

    if (foDims.width < 14) {
      const xoff = 14 - foDims.width;
      foDims.width = 14;
      foDims.x -= (xoff / 2);
    }

    paths.push(
      <foreignObject
        {...foDims}
        className={stylesPipelineBuilder.pathContextMenuOverlayLoader}
        key={`${lineID}-context-menu-overlay-loader`}
        ref={foRef as any}
      >
        <Loading circle />
      </foreignObject>
    );
  }

  const keys = ['left', 'top', 'width', 'height'];

  return {
    animate: shouldAnimate,
    defs,
    id: lineID,
    key: [
      keys
        ?.map(key => Math.round(fromRect?.[key]))
        .map(String)
        .join(':'),
      keys
        ?.map(key => Math.round(toRect?.[key]))
        .map(String)
        .join(':'),
    ].join('->'),
    paths,
    source: rectup,
    target: rectdn,
  };
}
