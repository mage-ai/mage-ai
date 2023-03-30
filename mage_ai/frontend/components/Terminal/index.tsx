import Ansi from 'ansi-to-react';
import useWebSocket from 'react-use-websocket';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import AuthToken from '@api/utils/AuthToken';
import ClickOutside from '@oracle/components/ClickOutside';
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
import { getWebSocket } from '@api/utils/url';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';

export const DEFAULT_TERMINAL_UUID = 'terminal';

type TerminalProps = {
  interruptKernel: () => void;
  onFocus?: () => void;
  uuid?: string;
  width?: number;
};

function Terminal({
  interruptKernel,
  onFocus,
  uuid: terminalUUID = DEFAULT_TERMINAL_UUID,
  width,
}: TerminalProps) {
  const refContainer = useRef(null);
  const refInner = useRef(null);

  const [command, setCommand] = useState<string>('');
  const [commandIndex, setCommandIndex] = useState<number>(0);
  const [finalCommand, setFinalCommand] = useState<string>('');
  const [cursorIndex, setCursorIndex] = useState<number>(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [focus, setFocus] = useState<boolean>(false);
  const [kernelOutputs, setKernelOutputs] = useState<(KernelOutputType & {
    command: boolean;
  })[]>([]);

  const [stdout, setStdout] = useState<string>();

  const {
    lastMessage,
    readyState,
    sendMessage,
  } = useWebSocket(getWebSocket('terminal'), {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastMessage) {
      const msg = JSON.parse(lastMessage.data);

      setStdout(prev => {
        const p = prev || '';
        if (msg[0] === 'stdout') {
          return p + msg[1];
        }
        return p;
      })
    }
  }, [
    lastMessage,
    terminalUUID,
  ]);

  const kernelOutputsUpdated = useMemo(() => {
    if (!stdout) {
      return [];
    }
    
    // Filter out commands to configure settings
    const splitStdout =
      stdout
        .split('\n')
        .filter(d => !d.includes("# Mage terminal settings command"));

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
    setCursorIndex(currIdx => (currIdx <= command.length) ? currIdx + 1 : currIdx);
  }, [command]);

  const handleCopiedText = useCallback((clipText) => {
    const lines = clipText?.split(/\n/) || [];
    if (lines.length > 1) {
      const enteredLines = lines.slice(0, -1);
      enteredLines[0] = command + enteredLines[0];
      const lineCommands = enteredLines.map((line, idx) => ({
        command: idx === 0,
        data: line,
        type: DataTypeEnum.TEXT,
      }));
      setCommandIndex(commandHistory.length + enteredLines.length);
      setCommandHistory(prev => prev.concat(enteredLines));
      // @ts-ignore
      setKernelOutputs(prev => prev.concat(lineCommands));
      setFinalCommand(prev => prev + enteredLines.join('\n'));
      const currentCommand = (lines.slice(-1)[0] || '').trim();
      setCommand(currentCommand);
      setCursorIndex(currentCommand.length);
    } else {
      setCommand(prev => prev + clipText);
      setCursorIndex(command.length + clipText.length);
    }
  }, [command, commandHistory]);

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
          const finalEnteredCommand = finalCommand + command;
          if (finalEnteredCommand?.length >= 0) {
            sendMessage(JSON.stringify([
              'stdin', finalEnteredCommand
            ]));
            sendMessage(JSON.stringify([
              'stdin', '\x03'
            ]));
            setCursorIndex(0);
          }
          setFinalCommand('');
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
            const finalEnteredCommand = finalCommand + command;
            sendMessage(JSON.stringify([
              'stdin', finalEnteredCommand
            ]));
            sendMessage(JSON.stringify([
              'stdin', '\r'
            ]));
            if (finalEnteredCommand?.length >= 2) {
              setCommandIndex(commandHistory.length + 1);
              setCommandHistory(prev => prev.concat(command));
              setCursorIndex(0);
            }
            setFinalCommand('');
            setCommand('');
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
            increaseCursorIndex();
          }
        }
      }
    },
    [
      command,
      commandHistory,
      commandIndex,
      focus,
      interruptKernel,
      setCommand,
      setCommandHistory,
      setCommandIndex,
      setKernelOutputs,
      terminalUUID,
    ],
  );

  const lastCommand = useMemo(() => {
    return kernelOutputsUpdated[kernelOutputsUpdated.length - 1]?.data;
  }, [kernelOutputsUpdated]);

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
                    noWrapping
                    pre
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
                    <LineStyle key={key}>
                      {displayElement}
                    </LineStyle>,
                  );
                }
              }
            });

            return acc.concat(arr);
          }, [])}

          {(
            <InputStyle
              focused={focus
                && (command?.length === 0 || cursorIndex > command?.length)}
            >
              <Text monospace>
                <Text inline monospace>
                  {lastCommand && (
                    <Ansi>
                      {lastCommand}
                    </Ansi>
                  )}
                </Text>
                {command?.split('').map(((char: string, idx: number) => (
                  <CharacterStyle
                    focusBeginning={focus && cursorIndex === 0 && idx === 0}
                    focused={focus && cursorIndex === idx + 1}
                    key={`command-${idx}-${char}`}
                  >
                    {char === ' ' && <>&nbsp;</>}
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
