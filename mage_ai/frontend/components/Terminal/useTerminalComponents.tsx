import Ansi from 'ansi-to-react';
import useWebSocket from 'react-use-websocket';
import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';
import { useContext, useRef } from 'react';

import AuthToken from '@api/utils/AuthToken';
import ClickOutside from '@oracle/components/ClickOutside';
import { getWebSocket } from '@api/utils/url';
import KeyboardContext from '@context/Keyboard';
import KernelOutputType, {
  DataTypeEnum,
  DATA_TYPE_TEXTLIKE,
} from '@interfaces/KernelOutputType';
import Text from '@oracle/elements/Text';
import {
  CharacterStyle,
  ContainerStyle,
  InnerStyle,
  InputStyle,
  LineStyle,
} from './index.style';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
  KEY_CODE_ARROW_UP,
  KEY_CODE_BACKSPACE,
  KEY_CODE_C,
  KEY_CODE_CONTROL,
  KEY_CODE_ENTER,
  KEY_CODE_META,
  KEY_CODE_V,
} from '@utils/hooks/keyboardShortcuts/constants';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { keysPresentAndKeysRecent, onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';

export default function useTerminalComponents({
  containerRef,
  uuid,
}) {
  const keyboardContext = useContext(KeyboardContext);
  const themeContext = useContext(ThemeContext);

  const focusRef = useRef(false);
  const cursorIndexRef = useRef(0);

  const commandRef = useRef('');
  const commandIndexRef = useRef();
  const commandHistoryRef = useRef();

  const inputIDRef = useRef('input-id');
  const inputRootRef = useRef(null);

  const outputIDRef = useRef('output-id');
  const outputRootRef = useRef(null);

  const stdoutRef = useRef('');
  const outputRef = useRef(null);

  const oauthWebsocketDataRef = useRef({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: (new AuthToken()).decodedToken.token,
  });

  function scrollTo() {
    // Whenever typing or when new messages come in
    if (containerRef?.current && outputRef?.current) {
      const height = outputRef?.current?.getBoundingClientRect().height;
      containerRef?.current?.scrollTo(0, height);
    }
  }

  function decreaseCursorIndex() {
    cursorIndexRef.current = cursorIndexRef?.current > 0
      ? cursorIndexRef?.current - 1
      : cursorIndexRef?.current;
  };

  function increaseCursorIndex() {
    cursorIndexRef.current = (cursorIndexRef?.current < commandRef?.current?.length)
      ? cursorIndexRef?.current + 1
      : cursorIndexRef?.current;
  };

  function handleCopiedText(clipText) {
    const lines = clipText?.split(/\n/) || [];
    if (lines.length > 1) {
      const enteredLines = lines.slice(0, -1);
      sendCommand((commandRef?.current || '') + enteredLines.join('\n'));
      const currentCommand = (lines.slice(-1)[0] || '').trim();
      commandRef.current = currentCommand;
      cursorIndexRef.current = currentCommand.length;
    } else {
      commandRef.current = prev => prev + clipText;
      cursorIndexRef.current = command.length + clipText.length;
    }
  }

  const {
    lastMessage,
    readyState,
    sendMessage,
  } = useWebSocket(getWebSocket(uuid), {
    queryParams: {
      term_name: uuid,
    },
    // shouldReconnect: (data) => {
    //   return false;
    // },
    // onOpen
    onMessage: () => {
      const msg = JSON.parse(lastMessage.data);
      stdoutRef.current = stdoutRef?.current || '';
      if (msg[0] === 'stdout') {
        const out = msg[1];
        stdoutRef.current += out;
      }
    },
  });

  function sendCommand(cmd) {
    sendMessage(JSON.stringify({
      ...(oauthWebsocketDataRef?.current || {}),
      command: ['stdin', cmd],
    }));
    sendMessage(JSON.stringify({
      ...(oauthWebsocketDataRef?.current || {}),
      command: ['stdin', '\r'],
    }));
    if (cmd?.length >= 2) {
      commandIndexRef.current = (commandHistoryRef?.length + 1);
      commandHistoryRef.current = (prev => prev.concat(cmd));
      cursorIndexRef.current = (0);
    }
    commandRef.current = '';
  }

  function getKernelOutputsUpdated() {
    // Update with new outputs
    const splitStdout =
      stdoutRef?.current
        .split('\n')
        .filter(d => !d.includes('# Mage terminal settings command'));

    return splitStdout.map(d => ({
      data: d,
      execution_state: null,
      type: DataTypeEnum.TEXT,
    }));
  }

  function getLastCommand() {
    const kernelOutputsUpdated = getKernelOutputsUpdated();
    return kernelOutputsUpdated?.[kernelOutputsUpdated?.length - 1]?.data;
  }

  function renderInput() {
    if (!inputRootRef?.current) {
      const domNode = document.getElementById(inputIDRef.current);
      if (domNode) {
        inputRootRef.current = createRoot(domNode);
      }
    }

    if (inputRootRef?.current) {
      const lastCommand = getLastCommand();

      inputRootRef?.current?.render(
        <KeyboardContext.Provider value={keyboardContext}>
          <ThemeProvider theme={themeContext}>
            <InputStyle
              focused={focusRef?.current
                && (commandRef?.current?.length === 0)}
            >
              <Text monospace>
                <Text inline monospace>
                  {lastCommand && (
                    <Ansi>
                      {Array.isArray(lastCommand) ? lastCommand.join('\n') : lastCommand}
                    </Ansi>
                  )}
                </Text>
                {commandRef?.current?.split('').map(((char: string, idx: number, arr: string[]) => (
                  <CharacterStyle
                    focusBeginning={focusRef?.current && cursorIndexRef?.current === 0 && idx === 0}
                    focused={
                      focusRef?.current &&
                        (cursorIndexRef?.current === idx + 1 ||
                          cursorIndexRef?.current >= arr.length && idx === arr.length - 1)
                    }
                    key={`command-${idx}-${char}`}
                  >
                    {char === ' ' && <>&nbsp;</>}
                    {char === '\n' && <br />}
                    {char !== ' ' && char}
                  </CharacterStyle>
                )))}
              </Text>
            </InputStyle>
          </ThemeProvider>
        </KeyboardContext.Provider>,
      );
    }
  }

  function renderOutput() {
    if (!outputRootRef?.current) {
      const domNode = document.getElementById(outputIDRef.current);
      if (domNode) {
        outputRootRef.current = createRoot(domNode);
      }
    }

    if (outputRootRef?.current) {
      const kernelOutputsUpdated = getKernelOutputsUpdated()

      outputRootRef?.current?.render(
        <KeyboardContext.Provider value={keyboardContext}>
          <ThemeProvider theme={themeContext}>
            <InnerStyle
              ref={outputRef}
            >
              {kernelOutputsUpdated?.reduce((acc, kernelOutput: {
                command?: string;
                data: string;
                type: DataTypeEnum;
              }, idx: number) => {
                if (idx == kernelOutputsUpdated.length - 1) {
                  return acc;
                }
                const {
                  command,
                  data: dataInit,
                  type: dataType,
                } = kernelOutput || {};

                let dataArray: string[] = [];
                if (Array.isArray(dataInit)) {
                  dataArray = dataInit;
                } else {
                  dataArray = [dataInit];
                }
                dataArray = dataArray.filter(d => d);

                const arr = [];

                dataArray.forEach((data: string, idxInner: number) => {
                  let displayElement;
                  if (DATA_TYPE_TEXTLIKE.includes(dataType)) {
                    displayElement = (
                      <Text
                        monospace
                        preWrap
                        // This used to be a no wrap Text component, but changing it
                        // to no wrap for now. Please change it back if you see any issues.
                      >
                        {data && (
                          <Ansi>
                            {data}
                          </Ansi>
                        )}
                      </Text>
                    );
                  }

                  if (displayElement) {
                    const key = `command-${idx}-${idxInner}-${data}`;

                    if (!command) {
                      arr.push(
                        // <LineStyle key={key}>
                        <div key={key}>
                          {displayElement}
                        </div>,
                        // </LineStyle>,
                      );
                    }
                  }
                });

                return acc.concat(arr);
              }, [])}
          </ThemeProvider>
        </KeyboardContext.Provider>,
      );
    }
  }

  return {
    input: <div id={inputIDRef.current} />,
    output: <div id={outputIDRef.current} />,
  }
}
