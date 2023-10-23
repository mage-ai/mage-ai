import {
  CUSTOM_EVENT_COLUMN_SCROLLER_RESET,
} from '@components/PipelineDetail/constants';

export function resetColumnScroller() {
  const evt = new CustomEvent(CUSTOM_EVENT_COLUMN_SCROLLER_RESET);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(evt);
  }
}
