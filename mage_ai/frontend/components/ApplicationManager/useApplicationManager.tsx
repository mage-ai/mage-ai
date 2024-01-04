import { createRef, useCallback, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import VersionControlFileDiffs from '@components/VersionControlFileDiffs';
import useResizeElement from '@utils/useResizeElement';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import { ApplicationExpansionUUIDEnum } from '@storage/ApplicationManager/constants';
import { buildDefaultLayout, getLayout, updateLayout } from '@storage/ApplicationManager/cache';

const ROOT_APPLICATION_UUID = 'ApplicationManager';

export default function useApplicationManager(): {
  getApplications: () => {
    applications: ApplicationConfiguration[];
    expansions: any[];
    containers: any[];
    roots: any[];
  };
  renderApplications: () => Element;
  startApplication: (applicationConfigration: ApplicationConfiguration) => void;
} {
  const refRootApplication = useRef(null);
  // References to the application configurations in memory.
  const refApplications = useRef({});
  // References to the rendered expansion component.
  const refExpansions = useRef({});
  // References to the containers that were rendered when renderApplications was called.
  const refContainers = useRef({});
  // References to the root DOM elements where expansions are rendered in.
  const refRoots = useRef({});

  const {
    setElement,
    setResizers,
  } = useResizeElement();

  function updateLayout() {

  }

  function injectStyles() {

  }

  function getApplications() {
    return {
      applications: refApplications,
      expansions: refExpansions,
      containers: refContainers,
      roots: refRoots,
    };
  }

  function renderApplications() {
    return (
      <>
        <div id={ROOT_APPLICATION_UUID} ref={refRootApplication} />

        {Object.keys(ApplicationExpansionUUIDEnum).map((uuid) => {
          if (!refContainers?.current) {
            refContainers.current = {};
          }

          const ref = refContainers?.current?.[uuid] || createRef()
          refContainers.current[uuid] = ref;

          return (
            <div
              id={uuid}
              key={uuid}
              ref={ref}
            />
          );
        })}
      </>
    );
  }

  // https://stackoverflow.com/questions/20926551/recommended-way-of-making-react-component-div-draggable
  // Draggable

  function startApplication(applicationConfigration: ApplicationConfiguration) {
    const {
      application,
    } = applicationConfigration;
    const {
      expansion_settings: expansionSettings,
    } = application;
    const uuid = expansionSettings?.uuid;

    if (!refApplications?.current) {
      refApplications.current = {};
    }
    refApplications.current[uuid] = applicationConfigration;

    if (ApplicationExpansionUUIDEnum.VersionControlFileDiffs === expansionSettings?.uuid) {
      if (!refRoots?.current?.[uuid]) {
        const domNode = document.getElementById(uuid);
        refRoots.current[uuid] = createRoot(domNode);
      }

      const ref = refExpansions?.current?.[uuid] || createRef();

      const expansion = (
        <div ref={ref}>
          <VersionControlFileDiffs
            applicationConfigration={applicationConfigration}
          />
        </div>
      );
      setElement(expansion);

      refRoots?.current?.[uuid]?.render(expansion);
    }
  }

  return {
    getApplications,
    renderApplications,
    startApplication,
  };
}
