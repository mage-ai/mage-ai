/**
 * FitAddon based on @xterm/addon-fit (MIT). Uses getBoundingClientRect for the
 * xterm parent so cols/rows match the visible area in flex layouts; stock addon
 * uses getComputedStyle height/width which is often wrong (auto/NaN), causing
 * shell wrap width to disagree with xterm and “same-line” redraw glitches.
 */
import type { ITerminalAddon, Terminal } from '@xterm/xterm';

const MINIMUM_COLS = 2;
const MINIMUM_ROWS = 1;

type TerminalWithCore = Terminal & {
  _core: {
    _renderService: {
      clear(): void;
      dimensions: {
        css: { cell: { width: number; height: number } };
      };
    };
  };
};

function overviewRulerReserve(terminal: Terminal): number {
  if (terminal.options.scrollback === 0) {
    return 0;
  }
  const w = terminal.options.overviewRuler?.width;
  return typeof w === 'number' ? w : 14;
}

export class FitAddon implements ITerminalAddon {
  private _terminal?: Terminal;

  public activate(terminal: Terminal): void {
    this._terminal = terminal;
  }

  public dispose(): void {}

  public fit(): void {
    const dims = this.proposeDimensions();
    if (!dims || !this._terminal || Number.isNaN(dims.cols) || Number.isNaN(dims.rows)) {
      return;
    }
    const term = this._terminal as TerminalWithCore;
    const core = term._core;
    if (this._terminal.rows !== dims.rows || this._terminal.cols !== dims.cols) {
      core._renderService.clear();
      this._terminal.resize(dims.cols, dims.rows);
    }
  }

  public proposeDimensions(): { cols: number; rows: number } | undefined {
    if (!this._terminal?.element?.parentElement) {
      return undefined;
    }
    const term = this._terminal as TerminalWithCore;
    const renderDims = term._core._renderService.dimensions;
    if (renderDims.css.cell.width === 0 || renderDims.css.cell.height === 0) {
      return undefined;
    }

    const parent = this._terminal.element.parentElement;
    const rect = parent.getBoundingClientRect();
    let parentWidth = rect.width;
    let parentHeight = rect.height;
    if (!parentWidth || !parentHeight) {
      parentWidth = parent.clientWidth;
      parentHeight = parent.clientHeight;
    }
    if (!parentWidth || !parentHeight) {
      return undefined;
    }

    const ruler = overviewRulerReserve(this._terminal);
    const elStyle = window.getComputedStyle(this._terminal.element);
    const padding = {
      top: parseInt(elStyle.getPropertyValue('padding-top'), 10) || 0,
      bottom: parseInt(elStyle.getPropertyValue('padding-bottom'), 10) || 0,
      right: parseInt(elStyle.getPropertyValue('padding-right'), 10) || 0,
      left: parseInt(elStyle.getPropertyValue('padding-left'), 10) || 0,
    };
    const verticalPadding = padding.top + padding.bottom;
    const horizontalPadding = padding.right + padding.left;
    const availableHeight = parentHeight - verticalPadding;
    const availableWidth = parentWidth - horizontalPadding - ruler;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return undefined;
    }

    return {
      cols: Math.max(
        MINIMUM_COLS,
        Math.floor(availableWidth / renderDims.css.cell.width),
      ),
      rows: Math.max(
        MINIMUM_ROWS,
        Math.floor(availableHeight / renderDims.css.cell.height),
      ),
    };
  }
}
