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
  KEY_CODE_K,
  KEY_CODE_META,
  KEY_CODE_V,
} from '@utils/hooks/keyboardShortcuts/constants';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { keysPresentAndKeysRecent, onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { sendMessage } from './utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';

export default function useTerminalComponents({
  containerRef,
  onMessage,
  queryParams,
  setupColors,
  uuid,
}: {
  containerRef?: {
    current: any;
  };
  onMessage?: (output: KernelOutputType) => void;
  queryParams?: {
    [key: string]: string;
  };
  setupColors?: boolean;
  uuid: string;
}) {
  const keyboardContext = useContext(KeyboardContext);
  const themeContext = useContext(ThemeContext);

  const focusRef = useRef(false);
  const cursorIndexRef = useRef(0);

  const commandRef = useRef('');
  const commandIndexRef = useRef(0);
  const commandHistoryRef = useRef(0);

  const inputIDRef = useRef('input-id');
  const inputRootRef = useRef(null);

  const outputIDRef = useRef('output-id');
  const outputRootRef = useRef(null);

  const stdoutRef = useRef('');
  const outputRef = useRef(null);

  const renderCounts = useRef(0);

  const oauthWebsocketDataRef = useRef({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: (new AuthToken()).decodedToken.token,
  });

  function setFocus(value) {
    const prev = focusRef?.current;
    if (typeof value === 'function') {
      focusRef.current = value(focusRef?.current);
    } else {
      focusRef.current = value;
    }

    if (prev !== value) {
      renderInput();
      renderOutput();
    }
  }

  function setCommand(value) {
    if (typeof value === 'function') {
      commandRef.current = value(commandRef?.current);
    } else {
      commandRef.current = value;
    }
    scrollTo();
  }

  function setCommandIndex(value) {
    if (typeof value === 'function') {
      commandIndexRef.current = value(commandIndexRef?.current);
    } else {
      commandIndexRef.current = value;
    }
  }

  function setCursorIndex(value) {
    if (typeof value === 'function') {
      cursorIndexRef.current = value(cursorIndexRef?.current);
    } else {
      cursorIndexRef.current = value;
    }
  }

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

  const {
    // lastMessage,
    // readyState,
    sendMessage: sendMessageInit,
  } = useWebSocket(getWebSocket(uuid), {
    queryParams,
    // shouldReconnect: (data) => {
    //   return false;
    // },
    onOpen: () => {
      if (setupColors) {
        sendCommand(sendMessage);
      }
    },
    onMessage: ({
      data,
    }) => {
      const msg = JSON.parse(data);
      stdoutRef.current = stdoutRef?.current || '';
      if (msg[0] === 'stdout') {
        const out = msg[1];
        stdoutRef.current += out;
      }
      getKernelOutputsUpdated();

      if (onMessage) {
        onMessage?.(data);
      }

      renderOutput();

      setTimeout(() => scrollTo(), 1);
    },
  });

  console.log(stdoutRef.current)

  function sendMessage(commands: string[]) {
    sendMessageInit(JSON.stringify({
      ...(oauthWebsocketDataRef?.current || {}),
      command: commands,
    }));
  }

  function sendCommand(cmd) {
    sendMessage(['stdin', cmd]);
    sendMessage(['stdin', '\r']);
    if (cmd?.length >= 2) {
      commandIndexRef.current = (commandHistoryRef?.length + 1);
      commandHistoryRef.current = (prev => prev.concat(cmd));
      cursorIndexRef.current = (0);
    }
    commandRef.current = '';
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
      console.log('renderInputs');
      const lastCommand = getLastCommand();

      inputRootRef?.current?.render(
        <KeyboardContext.Provider value={keyboardContext}>
          <ThemeProvider theme={themeContext}>
            <InputStyle
              focused={focusRef?.current
                && (commandRef?.current?.length === 0)}
              onClick={(e) => {
                pauseEvent(e);
                setFocus(true);
              }}
            >
              <Text monospace>
                <Text inline monospace>
                  {lastCommand && (
                    <Ansi>
                      {Array.isArray(lastCommand) ? lastCommand.join('\n') : lastCommand}
                    </Ansi>
                  )}
                </Text>
                {commandRef?.current
                  && typeof commandRef?.current === 'string'
                  && commandRef?.current?.split('').map(((char: string, idx: number, arr: string[]) => (
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

      scrollTo();
      renderCounts.current = (renderCounts.current || 0) + 1;
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
      console.log('renderOutputs');

      const kernelOutputsUpdated = getKernelOutputsUpdated()

      outputRootRef?.current?.render(
        <KeyboardContext.Provider value={keyboardContext}>
          <ThemeProvider theme={themeContext}>
            <div
              onClick={(e) => {
                pauseEvent(e);
                setFocus(true);
              }}
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
            </div>
          </ThemeProvider>
        </KeyboardContext.Provider>,
      );
    }
  }

  function registerKeyboardShortcuts(event, keyMapping, keyHistory) {
    const {
      code,
      key,
    } = event;
    const focus = !!focusRef?.current;

    if (!focus) {
      return
    }

    pauseEvent(event);

    const command = commandRef?.current;
    const commandHistory = commandHistoryRef?.current;
    const commandIndex = commandIndexRef?.current;
    const cursorIndex = cursorIndexRef?.current;

    if (onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_C], keyMapping)) {
      if (command?.length >= 0) {
        sendMessage(['stdin', command]);
        sendMessage(['stdin', '\x03']);
        setCursorIndex(0);
      }
      setCommand('');
    } else {
      if (KEY_CODE_BACKSPACE === code && !keyMapping[KEY_CODE_META]) {
        const minIdx = Math.max(0, cursorIndex - 1);
        setCommand(prev => prev.slice(0, minIdx) + prev.slice(cursorIndex));
        setCursorIndex(currIdx => Math.max(0, currIdx - 1));
      } else if (onlyKeysPresent([KEY_CODE_ARROW_LEFT], keyMapping)) {
        decreaseCursorIndex();
      } else if (onlyKeysPresent([KEY_CODE_ARROW_RIGHT], keyMapping)) {
        increaseCursorIndex();
      } else if (keysPresentAndKeysRecent([KEY_CODE_ARROW_UP], [KEY_CODE_ARROW_UP], keyMapping, keyHistory)) {
        if (commandHistory.length >= 1) {
          const idx = Math.max(0, commandIndex - 1);
          setCommand(commandHistory[idx]);
          setCommandIndex(idx);
          setCursorIndex(commandHistory[idx]?.length || 0);
        }
      } else if (keysPresentAndKeysRecent([KEY_CODE_ARROW_DOWN], [KEY_CODE_ARROW_DOWN], keyMapping, keyHistory)) {
        if (commandHistory.length >= 1) {
          const idx = Math.min(commandHistory.length, commandIndex + 1);
          const nextCommand = commandHistory[idx] || '';
          setCommand(nextCommand);
          setCommandIndex(idx);
          setCursorIndex(nextCommand.length);
        }
      } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping)) {
        sendCommand(command);
      } else if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_C], keyMapping)) {
        navigator.clipboard.writeText(window.getSelection().toString());
      } else if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_V], keyMapping)
        || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_V], keyMapping)) {
        if (typeof navigator?.clipboard === 'undefined') {
          alert('Clipboard pasting is not allowed in insecure contexts. If your Mage '
            + 'deployment is not secure but you still want to use clipboard paste, you '
            + 'can override this setting (which should only be done temporarily) '
            + 'on Chrome browsers by going to '
            + '"chrome://flags/#unsafely-treat-insecure-origin-as-secure", '
            + 'adding your origin to "Insecure origins treated as secure", '
            + 'and enabling that setting.');
        } else if (navigator?.clipboard?.readText) {
          navigator.clipboard.readText()
            .then(handleCopiedText)
            .catch(err => alert(`${err}
For Chrome, users need to allow clipboard permissions for this site under \
"Privacy and security" -> "Site settings".
For Safari, users need to allow the clipboard paste by clicking "Paste" \
in the context menu that appears.`),
            );
        } else if (navigator?.clipboard?.read) {
          navigator.clipboard.read()
            .then(clipboardItems => {
              for (const clipboardItem of clipboardItems) {
                for (const type of clipboardItem.types) {
                  if (type === 'text/plain') {
                    return clipboardItem.getType(type);
                  }
                }
              }
            }).then(blob => blob.text())
            .then(handleCopiedText)
            .catch(err => alert(`${err}
For Firefox, users need to allow clipboard paste by setting the "dom.events.asyncClipboard.read" \
preference in "about:config" to "true" and clicking "Paste" in the context menu that appears.`),
            );
        } else {
          alert(`If pasting is not working properly, you may need to adjust some settings in your browser.

For Firefox, users need to allow clipboard paste by setting both the "dom.events.asyncClipboard.clipboardItem" \
and "dom.events.asyncClipboard.read" preferences in "about:config" to "true" and clicking "Paste" in the context \
menu that appears.
For Chrome, users need to allow clipboard permissions for this site under \
"Privacy and security" -> "Site settings".
For Safari, users need to allow the clipboard paste by clicking "Paste" \
in the context menu that appears.
`);
        }
      } else if (!keyMapping[KEY_CODE_META] && !keyMapping[KEY_CODE_CONTROL] && key.length === 1) {
        setCommand(prev => prev?.slice(0, cursorIndex) + key + prev?.slice(cursorIndex));
        setCursorIndex(currIdx => currIdx + 1);
      } else if (keysPresentAndKeysRecent([KEY_CODE_META], [KEY_CODE_K], keyMapping, keyHistory)) {
        sendMessage(['stdin', '__CLEAR_OUTPUT__']);
        sendMessage(['stdin', '\r']);
        stdoutRef.current = '';

        return true;
      }
    }

    renderInput();
  }

  return {
    input: <div id={inputIDRef.current} />,
    output: <div id={outputIDRef.current} />,
    registerKeyboardShortcuts,
    renderInput,
    renderOutput,
    setFocus,
  };
}
