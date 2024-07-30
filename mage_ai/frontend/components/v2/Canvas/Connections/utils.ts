import { NodeItemType, RectType } from '../interfaces';
import { ConnectionType } from '../interfaces';
import { getBlockConnectionUUID } from '../Draggable/utils';

export function createConnection(
  fromItem: NodeItemType,
  toItem: NodeItemType,
  options?: Partial<ConnectionType>,
): ConnectionType {
  // Default the positions to 'right' and 'left' if not specified
  const defaultOptions: Omit<ConnectionType, 'from' | 'to'> = {
    curveControl: 0,
    fromPosition: 'right',
    id: null,
    toPosition: 'left',
  };

  const conn = {
    from: fromItem.id.toString(),
    fromItem,
    to: toItem.id.toString(),
    toItem,
    ...defaultOptions,
    ...options,
  };
  conn.id = conn.from;

  return conn as ConnectionType;
}

export function connectionUUID({ from, fromItem, to, toItem }: ConnectionType): string {
  if (fromItem?.block && toItem?.block) {
    return [
      fromItem?.block ? getBlockConnectionUUID(fromItem?.block) : '',
      toItem?.block ? getBlockConnectionUUID(toItem?.block) : '',
    ].join('-');
  } else if (
    (fromItem?.target?.block || fromItem?.block) &&
    (toItem?.target?.block || toItem?.block)
  ) {
    return [
      getBlockConnectionUUID((fromItem?.target || fromItem)?.block),
      getBlockConnectionUUID((toItem?.target || toItem)?.block),
    ].join('-');
  }

  return `${from}-${to}`;
}

function getAnchorPosition({ left, height, top, width, offset }: RectType, position?: string) {
  switch (position) {
    case 'top':
      return { x: left + width / 2, y: top };
    case 'bottom':
      return { x: left + width / 2, y: top + height };
    case 'left':
      return { x: left, y: top + height / 2 };
    case 'right':
      return { x: left + width, y: top + height / 2 };
    case 'middle':
      return { x: left + width / 2, y: top + height / 2 };
    default:
      return { x: left + width / 2, y: top + height / 2 }; // Default to middle
  }
}

function calculatePosition(
  {
    curveControl: curveControlArg,
    fromPosition: fromPositionArg,
    toPosition: toPositionArg,
  }: ConnectionType,
  fromRect: RectType,
  toRect: RectType,
) {
  const fromPosition = getAnchorPosition(fromRect, fromPositionArg);
  const toPosition = getAnchorPosition(toRect, toPositionArg);

  fromPosition.x += fromRect.offset?.x ?? 0;
  fromPosition.y += fromRect.offset?.y ?? 0;
  toPosition.x += toRect.offset?.x ?? 0;
  toPosition.y += toRect.offset?.y ?? 0;

  const { x: startX, y: startY } = fromPosition;
  const { x: endX, y: endY } = toPosition;

  const curveControl = curveControlArg ?? 0.5; // Default curve control value

  // Calculate control points for a smooth curve
  const controlPointX1 = startX + (endX - startX) * curveControl;
  const controlPointY1 = startY;
  const controlPointX2 = endX - (endX - startX) * curveControl;
  const controlPointY2 = endY;

  return {
    endX,
    endY,
    startX,
    startY,
    x1: controlPointX1,
    x2: controlPointX2,
    y1: controlPointY1,
    y2: controlPointY2,
  };
}

export function getPathD(
  opts: {
    curveControl?: number;
    fromPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection starts
    toPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection ends
  },
  fromRect: RectType,
  toRect: RectType,
): string {
  const { endX, endY, startX, startY, x1, x2, y1, y2 } = calculatePosition(
    opts as ConnectionType,
    fromRect,
    toRect,
  );

  return `M${startX},${startY} C${x1},${y1} ${x2},${y2} ${endX},${endY}`;
}

// export function parsePathD(d) {
//   const commandParams = {
//     // Specifies the number of parameters expected for each command type
//     'M': 2, 'm': 2,
//     'L': 2, 'l': 2,
//     'H': 1, 'h': 1,
//     'V': 1, 'v': 1,
//     'C': 6, 'c': 6,
//     'S': 4, 's': 4,
//     'Q': 4, 'q': 4,
//     'T': 2, 't': 2,
//     'A': 7, 'a': 7,
//     'Z': 0, 'z': 0
//   };

//   const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|[\-+]?[\d.]+(?:e[\-+]?[\d.]+)?/g);
//   if (!tokens) {
//     console.error('Failed to parse path data:', d);
//     return [];
//   }

//   const commands = [];
//   let currentParams = [];
//   tokens.forEach(token => {
//     if (token in commandParams) {
//       if (currentParams.length > 0) {
//         commands.push(currentParams);
//       }
//       currentParams = [token];
//     } else {
//       currentParams.push(parseFloat(token));
//       const expectedParamCount = commandParams[currentParams[0]];
//       if (currentParams.length - 1 === expectedParamCount) {
//         commands.push(currentParams);
//         // For implicit command repetition: continue with the same command if param numbers match
//         if(['M', 'm', 'L', 'l', 'T', 't'].includes(currentParams[0])) {
//             // Save the repeated command separately for clarity
//             currentParams = [currentParams[0]];
//         } else {
//             currentParams = [];
//         }
//       }
//     }
//   });
//   // Add trailing command if there’s an unterminated one at the end
//   if (currentParams.length > 0 && currentParams.length - 1 === commandParams[currentParams[0]]) {
//     commands.push(currentParams);
//   }

//   return commands.map(cmdArray => {
//     const cmd = cmdArray[0];
//     const params = cmdArray.slice(1);
//     return { command: cmd, params: params };
//   });
// }

export function parsePathD(d) {
  const commands = d.match(/[a-zA-Z][^a-zA-Z]*/g);

  if (!commands) {
    console.error('Failed to parse path data:', d);
    return null;
  }

  let parsedData = {
    startX: null,
    startY: null,
    x1: null, y1: null, // First control point for C
    x2: null, y2: null, // Second control point for C
    endX: null,
    endY: null,
  };

  commands.forEach((cmd) => {
    const type = cmd.charAt(0);
    const nums = cmd.slice(1).trim().split(/[ ,]+/).map(Number);

    switch (type) {
      case 'M':
        parsedData.startX = nums[0];
        parsedData.startY = nums[1];
        break;
      case 'C':
        parsedData.x1 = nums[0];
        parsedData.y1 = nums[1];
        parsedData.x2 = nums[2];
        parsedData.y2 = nums[3];
        parsedData.endX = nums[4];
        parsedData.endY = nums[5];
        break;
      case 'L':
      case 'H':
      case 'V':
      case 'S':
      case 'Q':
      case 'T':
      case 'A':
        // These commands may adjust endX and endY but are not handled in this simplified example
        // H and V only modify one axis, which we'll need to manage if compact path data is expected
        // L, S, Q, T, A have different parameter needs
        console.warn(`Command ${type} is recognized but not processed for this shape`);
        break;
      case 'Z':
        // Closes the path; no change to data structure required
        break;
      default:
        console.error(`Unknown command '${type}' encountered`);
        break;
    }
  });

  return parsedData.startX !== null ? parsedData : null;
}
