import ContextProvider from '@context/v2/ContextProvider';
import ExecutionOutput, { ExecutionOutputProps } from './ExecutionOutput';
import React, { createRef, useContext, useRef } from 'react';
import { DEBUG } from '@components/v2/utils/debug';
import { Root, createRoot } from 'react-dom/client';
import { ThemeContext } from 'styled-components';

export interface OutputManagerType {
  addGroup: (
    process: ExecutionOutputProps['process'],
    setEventStreamHandler: ExecutionOutputProps['setEventStreamHandler'],
    onMount?: ExecutionOutputProps['onMount'],
  ) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  groupsRef: React.RefObject<Record<string, React.RefObject<HTMLDivElement>>>;
  removeGroup: (uuid: string) => void;
  setContainer?: (elementRef: React.RefObject<HTMLDivElement>) => void;
  teardown: () => void;
}

export type OutputManagerProps = {
  containerID?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
};

export default function useOutputManager(options?: OutputManagerProps): OutputManagerType {
  const { containerID, containerRef: externalContainerRef } = options ?? {};

  const themeContext = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementsRef = useRef<Record<string, HTMLDivElement>>({});
  const rootRefs = useRef<Record<string, Root>>({});

  const groupsRef = useRef<Record<string, React.RefObject<HTMLDivElement>>>({});

  function setContainer(elementRef: React.RefObject<HTMLDivElement>): void {
    containerRef.current = elementRef.current;
  }

  function getContainer(): HTMLDivElement | null {
    if (containerRef.current) return containerRef.current;
    if (externalContainerRef?.current) return;
    if (containerID) {
      containerRef.current = document.getElementById(containerID) as HTMLDivElement;
      return containerRef.current;
    }
  }

  function addGroup(
    process: ExecutionOutputProps['process'],
    setEventStreamHandler: ExecutionOutputProps['setEventStreamHandler'],
    onMount?: ExecutionOutputProps['onMount'],
  ) {
    const uuid = process.message_request_uuid;
    DEBUG.codeExecution.manager && console.log('[OutputManager] Adding group...', uuid);

    if (!getContainer()) {
      DEBUG.codeExecution.manager && console.error('[OutputManager] containerRef is missing');
      return;
    }

    if (uuid in (elementsRef?.current ?? {})) {
      DEBUG.codeExecution.manager
        && console.error('[OutputManager] Group already exists', elementsRef.current);
      return;
    }

    const element = document.createElement('div');
    getContainer().appendChild(element);
    elementsRef.current[uuid] = element;

    groupsRef.current[uuid] = createRef();
    rootRefs.current[uuid] = createRoot(element);

    rootRefs.current[uuid].render(
      <ContextProvider theme={themeContext}>
        <ExecutionOutput
          onMount={onMount}
          process={process}
          ref={groupsRef.current[uuid]}
          setEventStreamHandler={setEventStreamHandler}
        />
      </ContextProvider >,
    );

    DEBUG.codeExecution.manager && console.log('[OutputManager] Group added...', uuid);
  }

  function removeGroup(uuid: string) {
    if (!(uuid in elementsRef.current)) return;

    setTimeout(() => {
      rootRefs.current[uuid].unmount();
      delete rootRefs.current[uuid];
      delete groupsRef.current[uuid];

      const element = elementsRef.current[uuid];
      if (element && getContainer()) {
        getContainer().removeChild(element);
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
    setContainer,
    teardown,
  };
}
