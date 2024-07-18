import ContextProvider from '@context/v2/ContextProvider';
import EventStreamType from '@interfaces/EventStreamType';
import ExecutionOutput, { ExecutionOutputProps } from './ExecutionOutput';
import React, { createRef, useContext, useRef } from 'react';
import { DEBUG } from '@components/v2/utils/debug';
import { Root, createRoot } from 'react-dom/client';
import { ThemeContext } from 'styled-components';
import { RegisterConsumer } from '../../../ExecutionManager/interfaces';

export interface OutputManagerType {
  addGroup: (
    messageRequestUUID: ExecutionOutputProps['messageRequestUUID'],
    subscribeToEvents: ExecutionOutputProps['subscribeToEvents'],
  ) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  groupsRef: React.RefObject<Record<string, React.RefObject<HTMLDivElement>>>;
  removeGroup: (uuid: string) => void;
  teardown: () => void;
}

export default function useOutputManager(): OutputManagerType {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef<Record<string, HTMLDivElement>>({});
  const rootRefs = useRef<Record<string, Root>>({});

  const groupsRef = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  function addGroup(
    messageRequestUUID: string,
    subscribeToEvents: (onMessage: (event: EventStreamType) => void) => void,
    onMount: () => void,
  ) {
    DEBUG.codeExecution.manager &&
      console.log('[OutputManager] Adding group...', messageRequestUUID);

    if (!containerRef.current) {
      DEBUG.codeExecution.manager && console.error('[OutputManager] containerRef is missing');
      return;
    }

    if (messageRequestUUID in (elementsRef?.current ?? {})) {
      DEBUG.codeExecution.manager &&
        console.error('[OutputManager] Group already exists', elementsRef.current);
      return;
    }

    const element = document.createElement('div');
    containerRef.current.appendChild(element);
    elementsRef.current[messageRequestUUID] = element;

    groupsRef.current[messageRequestUUID] = createRef();
    rootRefs.current[messageRequestUUID] = createRoot(element);

    rootRefs.current[messageRequestUUID].render(
      <ContextProvider theme={themeContext}>
        <ExecutionOutput
          messageRequestUUID={messageRequestUUID}
          onMount={onMount}
          ref={groupsRef.current[messageRequestUUID]}
          subscribeToEvents={subscribeToEvents}
        />
      </ContextProvider>,
    );

    DEBUG.codeExecution.manager &&
      console.log('[OutputManager] Group added...', messageRequestUUID);
  }

  function removeGroup(uuid: string) {
    if (!(uuid in elementsRef.current)) return;

    setTimeout(() => {
      rootRefs.current[uuid].unmount();
      delete rootRefs.current[uuid];
      delete groupsRef.current[uuid];

      const element = elementsRef.current[uuid];
      if (element && containerRef.current) {
        containerRef.current.removeChild(element);
      }
      delete elementsRef.current[uuid];

      DEBUG.codeExecution.manager && console.log('[OutputManager] Removed group', uuid);
    });
  }

  function teardown() {
    Object.keys(rootRefs.current).forEach(uuid => {
      removeGroup(uuid);
    });
  }

  return {
    addGroup,
    containerRef,
    groupsRef,
    removeGroup,
    teardown,
  };
}
