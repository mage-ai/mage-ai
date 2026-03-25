import { Terminal as XTerm } from '@xterm/xterm';

import { FitAddon } from './xtermFitAddon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'styled-components';

import AuthToken from '@api/utils/AuthToken';
import ClickOutside from '@oracle/components/ClickOutside';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { useKeyboardContext } from '@context/Keyboard';
import dark from '@oracle/styles/themes/dark';
import { ContainerStyle, XTermHost } from './index.style';

export const DEFAULT_TERMINAL_UUID = 'terminal';

type TerminalProps = {
  /** @deprecated Line buffer removed; xterm streams to PTY. */
  command?: string;
  commandHistory?: string[];
  commandIndex?: number;
  cursorIndex?: number;
  externalKeyboardShortcuts?: (
    event: KeyboardEvent,
    keyMapping: Record<string, boolean>,
    keyHistory: number[],
  ) => boolean;
  focus?: boolean;
  lastMessage: WebSocketEventMap['message'] | null;
  oauthWebsocketData?: {
    api_key: string;
    token: string;
  };
  onFocus?: () => void;
  /** @deprecated Output is rendered by xterm only. */
  outputs?: unknown;
  sendMessage: (message: string, keep?: boolean) => void;
  setCommand?: (prev: (value: string) => string) => void;
  setCommandHistory?: (prev: (value: string[]) => string[]) => void;
  setCommandIndex?: (prev: (value: number) => number) => void;
  setCursorIndex?: (prev: (value: number) => number) => void;
  setFocus?: (prev: (value: boolean) => boolean) => void;
  setStdout?: (prev: (value: string) => string) => void;
  stdout?: string;
  uuid?: string;
  width?: number;
};

function Terminal({
  externalKeyboardShortcuts,
  focus: focusProp,
  lastMessage,
  oauthWebsocketData: oauthWebsocketDataProp,
  onFocus,
  sendMessage,
  setFocus: setFocusProp,
  uuid: _uuid = DEFAULT_TERMINAL_UUID,
  width,
}: TerminalProps) {
  const refContainer = useRef<HTMLDivElement>(null);
  const refHost = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeDebounceRef = useRef<number | null>(null);

  const [focusState, setFocusState] = useState(false);
  const applyFocus = useCallback(
    (next: boolean) => {
      if (setFocusProp) {
        setFocusProp(() => next);
      } else {
        setFocusState(next);
      }
    },
    [setFocusProp],
  );
  const focus = useMemo(
    () => (typeof focusProp !== 'undefined' ? focusProp : focusState),
    [focusProp, focusState],
  );

  const theme = useTheme() as typeof dark;
  const bg = theme?.background?.blackTransparentDark || dark.background.blackTransparentDark;
  const fg = theme?.content?.default || dark.content.default;
  const cursor = theme?.accent?.yellow || dark.accent.yellow;

  const token = useMemo(() => new AuthToken(), []);
  const oauthWebsocketData = useMemo(
    () =>
      oauthWebsocketDataProp || {
        api_key: OAUTH2_APPLICATION_CLIENT_ID,
        token: token.decodedToken.token,
      },
    [oauthWebsocketDataProp, token],
  );

  const sendPayload = useCallback(
    (command: (string | number)[]) => {
      sendMessage(
        JSON.stringify({
          ...oauthWebsocketData,
          command,
        }),
      );
    },
    [oauthWebsocketData, sendMessage],
  );

  const fitAndNotifySize = useCallback(() => {
    const term = termRef.current;
    const fitAddon = fitAddonRef.current;
    if (!term || !fitAddon) {
      return;
    }
    try {
      fitAddon.fit();
    } catch {
      return;
    }
    const { cols, rows } = term;
    if (cols > 0 && rows > 0) {
      // terminado: self.size = command[1:3] then rows, cols = client.size → expect [rows, cols]
      sendPayload(['set_size', rows, cols]);
    }
  }, [sendPayload]);

  const clearScreen = useCallback(() => {
    termRef.current?.clear();
    sendPayload(['stdin', '__CLEAR_OUTPUT__']);
    sendPayload(['stdin', '\r']);
  }, [sendPayload]);

  const {
    setDisableGlobalKeyboardShortcuts,
  } = useKeyboardContext();

  const externalShortcutsRef = useRef(externalKeyboardShortcuts);
  externalShortcutsRef.current = externalKeyboardShortcuts;

  useEffect(() => {
    if (typeof window === 'undefined' || !refHost.current) {
      return undefined;
    }

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      overviewRuler: { width: 0 },
      scrollback: 5000,
      theme: {
        background: bg,
        cursor: cursor,
        foreground: fg,
      },
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(refHost.current);
    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      sendPayload(['stdin', data]);
    });

    term.attachCustomKeyEventHandler((domEvent) => {
      if (domEvent.metaKey && domEvent.key.toLowerCase() === 'k') {
        domEvent.preventDefault();
        clearScreen();
        return false;
      }
      const ext = externalShortcutsRef.current;
      if (ext) {
        const keyMapping: Record<string, boolean> = {
          Meta: domEvent.metaKey,
          Control: domEvent.ctrlKey,
          Shift: domEvent.shiftKey,
          Alt: domEvent.altKey,
        };
        if (ext(domEvent, keyMapping, [])) {
          domEvent.preventDefault();
          return false;
        }
      }
      return true;
    });

    const scheduleDebouncedFit = () => {
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
      resizeDebounceRef.current = window.setTimeout(() => {
        resizeDebounceRef.current = null;
        fitAndNotifySize();
      }, 50);
    };

    const refitUntilStable = () => {
      fitAndNotifySize();
      requestAnimationFrame(() => {
        fitAndNotifySize();
        requestAnimationFrame(() => {
          fitAndNotifySize();
        });
      });
      window.setTimeout(() => fitAndNotifySize(), 50);
      window.setTimeout(() => fitAndNotifySize(), 200);
    };
    refitUntilStable();
    void document.fonts.ready.then(() => {
      fitAndNotifySize();
      window.setTimeout(() => fitAndNotifySize(), 100);
    });

    const onWindowResize = () => scheduleDebouncedFit();
    window.addEventListener('resize', onWindowResize);

    const ro = new ResizeObserver(() => {
      scheduleDebouncedFit();
    });
    ro.observe(refHost.current);
    resizeObserverRef.current = ro;

    return () => {
      window.removeEventListener('resize', onWindowResize);
      ro.disconnect();
      resizeObserverRef.current = null;
      if (resizeDebounceRef.current) {
        window.clearTimeout(resizeDebounceRef.current);
      }
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
    };
    // Theme is applied in a separate effect; do not depend on colors here or the PTY session resets.
  }, [sendPayload, clearScreen]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) {
      return;
    }
    term.options.theme = {
      background: bg,
      cursor: cursor,
      foreground: fg,
    };
  }, [bg, cursor, fg]);

  useEffect(() => {
    const term = termRef.current;
    if (!lastMessage || !term) {
      return;
    }
    let msg: unknown;
    try {
      msg = JSON.parse(lastMessage.data);
    } catch {
      return;
    }
    if (!Array.isArray(msg) || typeof msg[0] !== 'string') {
      return;
    }
    if (msg[0] === 'stdout' && typeof msg[1] === 'string') {
      term.write(msg[1]);
    } else if (msg[0] === 'disconnect') {
      term.write('\r\n\x1b[33m[Disconnected]\x1b[0m\r\n');
    }
  }, [lastMessage]);

  useEffect(() => {
    const term = termRef.current;
    if (!term) {
      return;
    }
    if (focus) {
      term.focus();
    } else {
      term.blur();
    }
  }, [focus]);

  return (
    <ContainerStyle
      ref={refContainer}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
      width={width}
    >
      <ClickOutside
        isOpen
        onClick={() => {
          onFocus?.();
          applyFocus(true);
          setDisableGlobalKeyboardShortcuts(true);
          termRef.current?.focus();
        }}
        onClickOutside={() => {
          applyFocus(false);
          setDisableGlobalKeyboardShortcuts(false);
          termRef.current?.blur();
        }}
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <XTermHost ref={refHost} width={width} />
      </ClickOutside>
    </ContainerStyle>
  );
}

export default Terminal;
