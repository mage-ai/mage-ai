import ExecutionOutput, { ExecutionOutputProps } from './ExecutionOutput';
import React, { createRef, useContext, useRef, useEffect } from 'react';
import { DEBUG } from '@components/v2/utils/debug';
import { Root, createRoot } from 'react-dom/client';
import { ThemeContext, ThemeProvider } from 'styled-components';

export interface OutputManagerType {
  addGroup: (
    process: ExecutionOutputProps['process'],
    onEventRef: ExecutionOutputProps['onEventRef']) => void;
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
    process: ExecutionOutputProps['process'],
    onEventRef: ExecutionOutputProps['onEventRef'],
  ) {
    const uuid = process.message_request_uuid;
    DEBUG.codeExecution.manager && console.log('[OutputManager] Adding group...', uuid);

    if (!containerRef?.current) {
      DEBUG.codeExecution.manager && console.error('[OutputManager] containerRef is missing');
      return;
    }

    if (uuid in (elementsRef?.current ?? {})) {
      DEBUG.codeExecution.manager
        && console.error('[OutputManager] Group already exists', elementsRef.current);
      return;
    }

    const element = document.createElement('div');
    containerRef.current.appendChild(element);
    elementsRef.current[uuid] = element;

    groupsRef.current[uuid] = createRef();
    rootRefs.current[uuid] = createRoot(element);

    rootRefs.current[uuid].render(
      <ThemeProvider theme={themeContext}>
        <ExecutionOutput
          onEventRef={onEventRef}
          process={process}
          ref={groupsRef.current[uuid]}
        />
      </ThemeProvider>,
    );

    DEBUG.codeExecution.manager && console.log('[OutputManager] Group added...', uuid);
  }

  function removeGroup(uuid: string) {
    if (!(uuid in elementsRef.current)) return;

    rootRefs.current[uuid].unmount();
    delete rootRefs.current[uuid];
    delete groupsRef.current[uuid];

    const element = elementsRef.current[uuid];
    if (element && containerRef.current) {
      containerRef.current.removeChild(element);
    }
    delete elementsRef.current[uuid];

    DEBUG.codeExecution.manager && console.log('[OutputManager] Removed group', uuid);
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
