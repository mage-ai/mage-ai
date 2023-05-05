import Ansi from 'ansi-to-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AuthToken from '@api/utils/AuthToken';
import ClickOutside from '@oracle/components/ClickOutside';
import Text from '@oracle/elements/Text';
import {
  CharacterStyle,
  ContainerStyle,
  InnerStyle,
  InputStyle,
  LineStyle,
} from './index.style';
import {
  DataTypeEnum,
  DATA_TYPE_TEXTLIKE,
} from '@interfaces/KernelOutputType';
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
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';

export const DEFAULT_TERMINAL_UUID = 'terminal';

type TerminalProps = {
  lastMessage: WebSocketEventMap['message'] | null;
  onFocus?: () => void;
  sendMessage: (message: string, keep?: boolean) => void;
  uuid?: string;
  width?: number;
};

function Terminal({
  lastMessage,
  onFocus,
  sendMessage,
  uuid: terminalUUID = DEFAULT_TERMINAL_UUID,
  width,
}: TerminalProps) {
  const refContainer = useRef(null);
  const refInner = useRef(null);

  const [command, setCommand] = useState<string>('');
  const [commandIndex, setCommandIndex] = useState<number>(0);
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [focus, setFocus] = useState<boolean>(false);

  const [stdout, setStdout] = useState<string>();

  const token = useMemo(() => new AuthToken(), []);
  const oauthWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  useEffect(() => {
    if (lastMessage) {
      const msg = JSON.parse(lastMessage.data);

      setStdout(prev => {
        const p = prev || '';
        if (msg[0] === 'stdout') {
          const out = msg[1];
          return p + out;
        }
        return p;
      });
    }
  }, [
    lastMessage,
  ]);

  const kernelOutputsUpdated = useMemo(() => {
    if (!stdout) {
      return [];
    }
    
    // Filter out commands to configure settings
    const splitStdout =
      stdout
        .split('\n')
        .filter(d => !d.includes('# Mage terminal settings command'));

    return splitStdout.map(d => ({
      data: d,
      type: DataTypeEnum.TEXT,
    }));
  }, [stdout]);

  useEffect(() => {
    if (refContainer.current && refInner.current) {
      const height = refInner.current.getBoundingClientRect().height;
      refContainer.current.scrollTo(0, height);
    }
  }, [
    command,
    kernelOutputsUpdated,
    refContainer,
    refInner,
  ]);

  const {
    registerOnKeyDown,
    setDisableGlobalKeyboardShortcuts,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(terminalUUID);
  }, [unregisterOnKeyDown, terminalUUID]);

  const decreaseCursorIndex = useCallback(() => {
    setCursorIndex(currIdx => currIdx > 0 ? currIdx - 1 : currIdx);
  }, []);
  const increaseCursorIndex = useCallback(() => {
    setCursorIndex(currIdx => (currIdx < command.length) ? currIdx + 1 : currIdx);
  }, [command]);

  const sendCommand = useCallback((cmd) => {
    sendMessage(JSON.stringify({
      ...oauthWebsocketData,
      command: ['stdin', cmd],
    }));
    sendMessage(JSON.stringify({
      ...oauthWebsocketData,
      command: ['stdin', '\r'],
    }));
    if (cmd?.length >= 2) {
      setCommandIndex(commandHistory.length + 1);
      setCommandHistory(prev => prev.concat(cmd));
      setCursorIndex(0);
    }
    setCommand('');
  }, [
    commandHistory,
    sendMessage,
    setCommand,
    setCommandHistory,
    setCommandIndex,
    setCursorIndex,
  ]);

  const handleCopiedText = useCallback((clipText) => {
    const lines = clipText?.split(/\n/) || [];
    if (lines.length > 1) {
      const enteredLines = lines.slice(0, -1);
      sendCommand(command + enteredLines.join('\n'));
      const currentCommand = (lines.slice(-1)[0] || '').trim();
      setCommand(currentCommand);
      setCursorIndex(currentCommand.length);
    } else {
      setCommand(prev => prev + clipText);
      setCursorIndex(command.length + clipText.length);
    }
  }, [
    command,
    sendCommand,
    setCommand,
    setCursorIndex,
  ]);

  registerOnKeyDown(
    terminalUUID,
    (event, keyMapping, keyHistory) => {
      const {
        code,
        key,
      } = event;

      if (focus) {
        pauseEvent(event);
        if (onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_C], keyMapping)) {
          if (command?.length >= 0) {
            sendMessage(JSON.stringify({
              ...oauthWebsocketData,
              command: ['stdin', command],
            }));
            sendMessage(JSON.stringify({
              ...oauthWebsocketData,
              command: ['stdin', '\x03'],
            }));
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
          } else if (onlyKeysPresent([KEY_CODE_ARROW_UP], keyMapping)) {
            if (commandHistory.length >= 1) {
              const idx = Math.max(0, commandIndex - 1);
              setCommand(commandHistory[idx]);
              setCommandIndex(idx);
              setCursorIndex(commandHistory[idx]?.length || 0);
            }
          } else if (onlyKeysPresent([KEY_CODE_ARROW_DOWN], keyMapping)) {
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
            setCommand(prev => prev.slice(0, cursorIndex) + key + prev.slice(cursorIndex));
            setCursorIndex(currIdx => currIdx + 1);
          }
        }
      }
    },
    [
      command,
      commandHistory,
      commandIndex,
      focus,
      setCommand,
      setCommandHistory,
      setCommandIndex,
      terminalUUID,
    ],
  );

  const lastCommand = useMemo(
    () => kernelOutputsUpdated[kernelOutputsUpdated.length - 1]?.data,
    [kernelOutputsUpdated],
  );

  return (
    <ContainerStyle
      ref={refContainer}
      width={width}
    >
      <ClickOutside
        isOpen
        onClick={() => {
          onFocus?.();
          setFocus(true);
          setDisableGlobalKeyboardShortcuts(true);
        }}
        onClickOutside={() => {
          setFocus(false);
          setDisableGlobalKeyboardShortcuts(false);
        }}
        style={{
          minHeight: '100%',
        }}
      >
        <InnerStyle
          ref={refInner}
          width={width}
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

          {(
            <InputStyle
              focused={focus
                && (command?.length === 0)}
            >
              <Text monospace>
                <Text inline monospace>
                  {lastCommand && (
                    <Ansi>
                      {lastCommand}
                    </Ansi>
                  )}
                </Text>
                {command?.split('').map(((char: string, idx: number, arr: string[]) => (
                  <CharacterStyle
                    focusBeginning={focus && cursorIndex === 0 && idx === 0}
                    focused={
                      focus && 
                        (cursorIndex === idx + 1 ||
                          cursorIndex >= arr.length && idx === arr.length - 1)
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
          )}
        </InnerStyle>
      </ClickOutside>
    </ContainerStyle>
  );
}

export default Terminal;
