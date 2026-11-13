import { renderHook, act } from '@testing-library/react-hooks';
import { useExecutionPanelResize } from '@components/Sidekick/useExecutionPanelResize';
import {
  COLLAPSED_PANEL_HEIGHT,
  OUTPUT_HEIGHT,
} from '@components/PipelineDetail/PipelineExecution/constants';
import * as localStorageModule from '@storage/localStorage';
import * as sizesModule from '@utils/sizes';

jest.mock('@storage/localStorage', () => ({
  LOCAL_STORAGE_KEY_PIPELINE_EXECUTION_HIDDEN: 'pipeline_execution_hidden',
  get: jest.fn(),
  set: jest.fn(),
}));

jest.mock('@utils/sizes', () => ({
  useWindowSize: jest.fn(),
}));

const MOCK_WINDOW_HEIGHT = 1000;
const GRAPH_MAX_HEIGHT = 904

describe('useExecutionPanelResize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (sizesModule.useWindowSize as jest.Mock).mockReturnValue({ height: MOCK_WINDOW_HEIGHT });
  });

  it('initializes safely with default values (visible)', () => {
    (localStorageModule.get as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useExecutionPanelResize({ isStreaming: false }));

    expect(result.current.isPipelineExecutionHidden).toBe(false);
    expect(result.current.panelHeight).toBe(OUTPUT_HEIGHT);
    expect(result.current.graphHeight).toBe(GRAPH_MAX_HEIGHT);
  });

  it('initializes safely with default values (hidden from localStorage)', () => {
    (localStorageModule.get as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useExecutionPanelResize({ isStreaming: false }));

    expect(result.current.isPipelineExecutionHidden).toBe(true);
    expect(result.current.panelHeight).toBe(COLLAPSED_PANEL_HEIGHT);
  });

  it('adjusts graphHeight explicitly when isStreaming is true', () => {
    (localStorageModule.get as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useExecutionPanelResize({ isStreaming: true }));

    expect(result.current.graphHeight).toBe(GRAPH_MAX_HEIGHT - COLLAPSED_PANEL_HEIGHT);
  });

  it('toggles visibility and restores natural height when unhidden from collapsed state', () => {
    (localStorageModule.get as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useExecutionPanelResize({ isStreaming: true }));

    expect(result.current.isPipelineExecutionHidden).toBe(true);
    expect(result.current.panelHeight).toBe(COLLAPSED_PANEL_HEIGHT);

    act(() => {
      result.current.togglePipelineExecutionHidden(false);
    });

    expect(result.current.isPipelineExecutionHidden).toBe(false);
    expect(result.current.panelHeight).toBe(OUTPUT_HEIGHT);
  });

  it('toggles visibility to hidden and shrinks panel height naturally', () => {
    (localStorageModule.get as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useExecutionPanelResize({ isStreaming: true }));

    expect(result.current.isPipelineExecutionHidden).toBe(false);
    expect(result.current.panelHeight).toBe(OUTPUT_HEIGHT);

    act(() => {
      result.current.togglePipelineExecutionHidden(true);
    });

    expect(result.current.isPipelineExecutionHidden).toBe(true);
    expect(result.current.panelHeight).toBe(COLLAPSED_PANEL_HEIGHT);
  });

  it('sets isDraggingPanel to true when handleDragStart is invoked', () => {
    const { result } = renderHook(() => useExecutionPanelResize({ isStreaming: false }));

    expect(result.current.isDraggingPanel).toBe(false);

    act(() => {
      const mockEvent = {
        preventDefault: jest.fn(),
        clientY: 500,
      } as unknown as React.MouseEvent;

      result.current.handleDragStart(mockEvent);
    });

    expect(result.current.isDraggingPanel).toBe(true);
  });
});
