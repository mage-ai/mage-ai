import { indexBy } from '@utils/array';

const KEYS = indexBy(
  [
    'onAbort',
    'onAbortCapture',
    'onAnimationEnd',
    'onAnimationEndCapture',
    'onAnimationIteration',
    'onAnimationIterationCapture',
    'onAnimationStart',
    'onAnimationStartCapture',
    'onAuxClick',
    'onAuxClickCapture',
    'onBlur',
    'onBlurCapture',
    'onCanPlay',
    'onCanPlayCapture',
    'onCanPlayThrough',
    'onCanPlayThroughCapture',
    'onChange',
    'onChangeCapture',
    'onClick',
    'onClickCapture',
    'onCompositionEnd',
    'onCompositionEndCapture',
    'onCompositionStart',
    'onCompositionStartCapture',
    'onCompositionUpdate',
    'onCompositionUpdateCapture',
    'onContextMenu',
    'onContextMenuCapture',
    'onCopy',
    'onCopyCapture',
    'onCut',
    'onCutCapture',
    'onDoubleClick',
    'onDoubleClickCapture',
    'onDrag',
    'onDragCapture',
    'onDragEnd',
    'onDragEndCapture',
    'onDragEnter',
    'onDragEnterCapture',
    'onDragExit',
    'onDragLeave',
    'onDragLeaveCapture',
    'onDragOver',
    'onDragOverCapture',
    'onDragStart',
    'onDragStartCapture',
    'onDrop',
    'onDropCapture',
    'onDurationChange',
    'onDurationChangeCapture',
    'onEmptied',
    'onEmptiedCapture',
    'onEncrypted',
    'onEncryptedCapture',
    'onEnded',
    'onEndedCapture',
    'onError',
    'onErrorCapture',
    'onFocus',
    'onFocusCapture',
    'onGotPointerCapture',
    'onGotPointerCaptureCapture',
    'onInput',
    'onInputCapture',
    'onInvalid',
    'onInvalidCapture',
    'onKeyDown',
    'onKeyPress',
    'onKeyUp',
    'onLoad',
    'onLoadCapture',
    'onLoadStart',
    'onLoadStartCapture',
    'onLoadedData',
    'onLoadedDataCapture',
    'onLoadedMetadata',
    'onLoadedMetadataCapture',
    'onLostPointerCapture',
    'onLostPointerCaptureCapture',
    'onMouseDown',
    'onMouseEnter',
    'onMouseLeave',
    'onMouseUp',
    'onPaste',
    'onPasteCapture',
    'onPause',
    'onPauseCapture',
    'onPlay',
    'onPlayCapture',
    'onPlaying',
    'onPlayingCapture',
    'onPointerCancel',
    'onPointerCancelCapture',
    'onPointerDown',
    'onPointerDownCapture',
    'onPointerEnter',
    'onPointerEnterCapture',
    'onPointerLeave',
    'onPointerLeaveCapture',
    'onPointerMove',
    'onPointerMoveCapture',
    'onPointerOut',
    'onPointerOutCapture',
    'onPointerOver',
    'onPointerOverCapture',
    'onPointerUp',
    'onPointerUpCapture',
    'onProgress',
    'onProgressCapture',
    'onRateChange',
    'onRateChangeCapture',
    'onReset',
    'onResetCapture',
    'onScroll',
    'onScrollCapture',
    'onSeeked',
    'onSeekedCapture',
    'onSeeking',
    'onSeekingCapture',
    'onStalled',
    'onStalledCapture',
    'onSubmit',
    'onSubmitCapture',
    'onSuspend',
    'onSuspendCapture',
    'onTimeUpdate',
    'onTimeUpdateCapture',
    'onToggle',
    'onToggleCapture',
    'onTouchCancel',
    'onTouchCancelCapture',
    'onTouchEnd',
    'onTouchEndCapture',
    'onTouchMove',
    'onTouchMoveCapture',
    'onTouchStart',
    'onTouchStartCapture',
    'onTransitionEnd',
    'onTransitionEndCapture',
    'onVolumeChange',
    'onVolumeChangeCapture',
    'onWaiting',
    'onWaitingCapture',
    'onWheel',
    'onWheelCapture',
    'style',
  ],
  key => key,
);

export type ElementType = {
  onAbort?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAbortCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationEnd?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationEndCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationIteration?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationIterationCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationStart?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAnimationStartCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAuxClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onAuxClickCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onBlur?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onBlurCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCanPlay?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCanPlayCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCanPlayThrough?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCanPlayThroughCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onChange?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onChangeCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onClickCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCompositionEnd?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCompositionEndCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCompositionStart?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCompositionStartCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCompositionUpdate?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCompositionUpdateCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onContextMenuCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCopy?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCopyCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCut?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCutCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClickCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDrag?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragEndCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragEnterCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragExit?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragLeaveCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragOver?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragOverCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStart?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDragStartCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDrop?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDropCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDurationChange?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onDurationChangeCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEmptied?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEmptiedCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEncrypted?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEncryptedCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEnded?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onEndedCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onError?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onErrorCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onFocus?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onFocusCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onGotPointerCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onGotPointerCaptureCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onInput?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onInputCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onInvalid?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onInvalidCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyPress?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onKeyUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoad?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoadCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoadStart?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoadStartCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoadedData?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoadedDataCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoadedMetadata?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLoadedMetadataCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLostPointerCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onLostPointerCaptureCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPaste?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPasteCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPause?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPauseCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPlay?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPlayCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPlaying?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPlayingCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerCancelCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerDownCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerEnter?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerEnterCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerLeave?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerLeaveCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerMoveCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerOut?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerOutCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerOver?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerOverCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onPointerUpCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onProgress?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onProgressCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onRateChange?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onRateChangeCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onReset?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onResetCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onScroll?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onScrollCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSeeked?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSeekedCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSeeking?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSeekingCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onStalled?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onStalledCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSubmit?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSubmitCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSuspend?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onSuspendCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTimeUpdate?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTimeUpdateCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onToggle?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onToggleCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchCancel?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchCancelCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchEnd?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchEndCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchMove?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchMoveCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStart?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTouchStartCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTransitionEnd?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onTransitionEndCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onVolumeChange?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onVolumeChangeCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onWaiting?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onWaitingCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onWheel?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onWheelCapture?: (event: React.MouseEvent<HTMLDivElement>) => void;
  role?: string;
  style?: React.CSSProperties;
};

export function extractProps(props: { [key: string]: any }) {
  return Object.entries(props).reduce(
    (acc, [key, value]) => ({
      ...acc,
      ...(key in KEYS ? { [key]: value } : {}),
    }),
    {},
  );
}
