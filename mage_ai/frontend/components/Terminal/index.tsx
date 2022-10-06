import Ansi from 'ansi-to-react';
import useWebSocket from 'react-use-websocket';
import { useEffect, useRef, useState } from 'react';

import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType, {
  DataTypeEnum,
  DATA_TYPE_TEXTLIKE,
  ExecutionStateEnum,
} from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import {
  KEY_CODE_ARROW_DOWN,
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
  KEY_CODE_ARROW_UP,
  KEY_CODE_BACKSPACE,
  KEY_CODE_CONTROL,
  KEY_CODE_ENTER,
  KEY_CODE_META,
  KEY_CODE_V,
} from '@utils/hooks/keyboardShortcuts/constants';
import {
  ContainerStyle,
  InnerStyle,
  InputStyle,
} from './index.style';
import { getWebSocket } from '@api/utils/url';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useKeyboardContext } from '@context/Keyboard';

const DEFAULT_TERMINAL_UUID = 'terminal';

type TerminalProps = {
  uuid?: string;
  width?: number;
};

function Terminal({
  uuid: terminalUUID = DEFAULT_TERMINAL_UUID,
  width,
}: TerminalProps) {
  const refContainer = useRef(null);
  const refInner = useRef(null);

  const [busy, setBusy] = useState<boolean>(false);
  const [command, setCommand] = useState<string>('');
  const [commandIndex, setCommandIndex] = useState<number>(0);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [kernelOutputs, setKernelOutputs] = useState<KernelOutputType[]>([]);

  const {
    lastMessage,
    readyState,
    sendMessage,
  } = useWebSocket(getWebSocket(), {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastMessage) {
      const data = lastMessage?.data ? JSON.parse(lastMessage.data) : null;

      if (ExecutionStateEnum.BUSY === data?.execution_state) {
        setBusy(true);
      } else if (ExecutionStateEnum.IDLE === data?.execution_state) {
        setBusy(false);
      }

      setKernelOutputs(prev => {
        if (data) {
          return prev.concat(data);
        }

        return prev;
      });

      if (refContainer.current && refInner.current) {
        const height = refInner.current.getBoundingClientRect().height;
        refContainer.current.scrollTo(0, height);
      }
    }
  }, [
    lastMessage,
    refContainer,
    refInner,
    setBusy,
    setKernelOutputs,
  ]);

  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(terminalUUID);
  }, [unregisterOnKeyDown, terminalUUID]);

  registerOnKeyDown(
    terminalUUID,
    (event, keyMapping, keyHistory) => {
      const {
        code,
        key,
      } = event;

      if (busy) {
        return;
      }

      if (KEY_CODE_BACKSPACE === code && !keyMapping[KEY_CODE_META]) {
        setCommand(prev => prev.slice(0, prev.length - 1));
      } else if (onlyKeysPresent([KEY_CODE_ARROW_UP], keyMapping)) {
        event.preventDefault();
        if (commandHistory.length >= 1) {
          const idx = Math.max(0, commandIndex - 1);
          setCommand(commandHistory[idx]);
          setCommandIndex(idx);
        }
      } else if (onlyKeysPresent([KEY_CODE_ARROW_DOWN], keyMapping)) {
        event.preventDefault();
        if (commandHistory.length >= 1) {
          const idx = Math.min(commandHistory.length, commandIndex + 1);
          setCommand(commandHistory[idx] || '');
          setCommandIndex(idx);
        }
      } else if (onlyKeysPresent([KEY_CODE_ENTER], keyMapping)) {
        event.preventDefault();
        if (command?.length >= 1) {
          setBusy(true);
          sendMessage(JSON.stringify({
            code: `!${command}`,
            uuid: terminalUUID,
          }));
          setCommandIndex(commandHistory.length + 1);
          setCommandHistory(prev => prev.concat(command));
        }
        setKernelOutputs(prev => prev.concat({
          command: true,
          data: command?.trim()?.length >= 1 ? command : '\n',
          type: DataTypeEnum.TEXT,
        }));
        setCommand('');
      } else if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_V], keyMapping)) {
        navigator.clipboard.readText().then(clipText => setCommand(prev => prev + clipText));
      } else if (!keyMapping[KEY_CODE_META] && !keyMapping[KEY_CODE_CONTROL] && key.length === 1) {
        setCommand(prev => prev + key);
      }
    },
    [
      busy,
      command,
      commandHistory,
      commandIndex,
      setBusy,
      setCommand,
      setCommandHistory,
      setCommandIndex,
      setKernelOutputs,
      terminalUUID,
    ],
  );

  const commandToDisplay = command?.split('').map(((char: string, idx: number) => (
    <span key={`command-${idx}-${char}`}>
      {char === ' ' && <>&nbsp;</>}
      {char !== ' ' && char}
    </span>
  )));

  return (
    <ContainerStyle
      ref={refContainer}
      width={width}
    >
      <InnerStyle ref={refInner}>
        {kernelOutputs?.reduce((acc, kernelOutput: KernelOutputType, idx: number) => {
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
                  preWrap
                >
                  {data && (
                    <Ansi>
                      {data}
                    </Ansi>
                  )}
                  {!data && <>&nbsp;</>}
                </Text>
              );
            }

            if (displayElement) {
              const key = `command-${idx}-${idxInner}-${data}`;

              if (command) {
                arr.push(
                  <FlexContainer key={key}>
                    <Text inline monospace warning>
                      →&nbsp;
                    </Text>
                    {displayElement}
                  </FlexContainer>
                );
              } else {
                arr.push(
                  <div key={key}>
                    {displayElement}
                  </div>
                );
              }
            }
          });

          return acc.concat(arr);
        }, [])}

        {busy && (
          <Spacing mt={1}>
            <Spinner />
          </Spacing>
        )}

        {!busy && (
          <InputStyle>
            <Text monospace>
              <Text inline monospace warning>
                →&nbsp;
              </Text>
              {commandToDisplay}
            </Text>
          </InputStyle>
        )}
      </InnerStyle>
    </ContainerStyle>
  );
}

export default Terminal;
