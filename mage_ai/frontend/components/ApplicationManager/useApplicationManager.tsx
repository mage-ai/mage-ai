import { createRef, useCallback, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import VersionControlFileDiffs from '@components/VersionControlFileDiffs';
import useResizeElement from '@utils/useResizeElement';
import { ApplicationConfiguration } from '@components/CommandCenter/constants';
import { ApplicationExpansionUUIDEnum } from '@storage/ApplicationManager/constants';
import { buildDefaultLayout, getLayout, updateLayout } from '@storage/ApplicationManager/cache';
import {
  ContainerStyle,
  ContentStyle,
  InnerStyle,
  ResizeLeftStyle,
  ResizeRightStyle,
  ResizeTopStyle,
  ResizeBottomStyle,
} from './index.style';

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
  // 4 sides of each application can be used to resize the application.
  const refResizers = useRef({});

  const {
    setResizableObject,
    setResizersObjects,
  } = useResizeElement();

  function updateLayout(uuid: ApplicationExpansionUUIDEnum) {
    const layout = getLayout(uuid) || buildDefaultLayout({
      height: typeof window !== 'undefined' ? window?.screen?.height : null,
      width: typeof window !== 'undefined' ? window?.screen?.width : null,
    });

    const {
      dimension: {
        height,
        width,
      },
      position: {
        x,
        y,
        z,
      },
    } = layout;

    const expansion = refExpansions?.current?.[uuid];
    console.log(layout, refExpansions?.current)
    expansion.current.style.height = `${height}px`;
    expansion.current.style.width = `${width}px`;
    expansion.current.style.position = 'fixed';
    expansion.current.style.left = `${x}px`;
    expansion.current.style.top = `${y}px`;
    expansion.current.style.zIndex = `${z}`;
    console.log(expansion.current.style)
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

    if (ApplicationExpansionUUIDEnum.VersionControlFileDiffs === uuid) {
      if (!refRoots?.current?.[uuid]) {
        const domNode = document.getElementById(uuid);
        refRoots.current[uuid] = createRoot(domNode);
      }

      const ref = refExpansions?.current?.[uuid] || createRef();
      refExpansions.current[uuid] = ref;

      const layout = getLayout(uuid) || buildDefaultLayout({
        height: typeof window !== 'undefined' ? window?.innerHeight : null,
        width: typeof window !== 'undefined' ? window?.innerWidth : null,
      });


      if (!refResizers?.current?.[uuid]) {
        refResizers.current[uuid] = {
          bottom: createRef(),
          left: createRef(),
          right: createRef(),
          top: createRef(),
        };
      }

      const rr = refResizers?.current?.[uuid];

      const {
        dimension: {
          height,
          width,
        },
        position: {
          x,
          y,
          z,
        },
      } = layout;
      const expansion = (
        <ContainerStyle
          ref={ref}
          style={{
            height,
            left: x,
            top: y,
            width,
            zIndex: z,
        }}>
          <ResizeBottomStyle ref={rr?.bottom} />
          <ResizeLeftStyle ref={rr?.left} />
          <ResizeRightStyle ref={rr?.right} />
          <ResizeTopStyle ref={rr?.top} />

          <ContentStyle>
            <InnerStyle>
              <VersionControlFileDiffs
                applicationConfigration={applicationConfigration}
              />
            </InnerStyle>
          </ContentStyle>
        </ContainerStyle>
      );

      refRoots?.current?.[uuid]?.render(expansion);

      setResizableObject(ref, {
        tries: 10,
      });
      setResizersObjects(Object.values(rr || {}), {
        tries: 10,
      });
    }
  }

  return {
    getApplications,
    renderApplications,
    startApplication,
  };
}
