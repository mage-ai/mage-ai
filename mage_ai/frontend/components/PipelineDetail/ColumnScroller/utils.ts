import BlockType from '@interfaces/BlockType';
import {
  CUSTOM_EVENT_COLUMN_SCROLLER_RESET,
  CUSTOM_EVENT_COLUMN_SCROLLER_SCROLL_TO_BLOCK,
} from '@components/PipelineDetail/constants';

export function resetColumnScroller() {
  const evt = new CustomEvent(CUSTOM_EVENT_COLUMN_SCROLLER_RESET);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(evt);
  }
}

export function scrollToBlock(block: BlockType) {
  const evt = new CustomEvent(CUSTOM_EVENT_COLUMN_SCROLLER_SCROLL_TO_BLOCK, {
    detail: {
      block,
    },
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(evt);
  }
}
