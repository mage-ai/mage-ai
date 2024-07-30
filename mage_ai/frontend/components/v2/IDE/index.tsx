import { useEffect, useMemo, useRef } from 'react';

import Loading from '@mana/components/Loading';
import { EventListeners, addListeners, addListenersForDiff } from './events/addListeners';
import addEditorActions from './actions/addEditorActions';
import useManager from './useManager';
import { ContainerStyled, IDEStyled } from './index.style';
import { IDEProps, ResourceType } from './interfaces';
import { IDEThemeEnum } from './themes/interfaces';

function MateriaIDE({
  configurations: configurationsOverride,
  containerClassName,
  editorClassName,
  editorActions,
  eventListeners,
  onMountEditor,
  persistManagerOnUnmount,
  persistResourceOnUnmount,
  resource,
  style,
  theme: themeSelected,
  uuid,
}: IDEProps & {
  resource: ResourceType;
  uuid: string;
}) {
  const editorContainerRef = useRef(null);
  const diffEditorRef = useRef(null);
  const editorRef = useRef(null);
  const managerRef = useRef(null);
  const containerRef = useRef(null);

  const wrapperSettings = useMemo(
    () => ({
      options: {
        configurations: {
          ...configurationsOverride,
          theme: themeSelected,
        },
      },
    }),
    [configurationsOverride, themeSelected],
  );
  const manager = useManager(uuid, resource, {
    wrapper: wrapperSettings,
  });

  useEffect(() => {
    if (editorContainerRef?.current && !managerRef.current && manager) {
      const initializeWrapper = async () => {
        managerRef.current = manager;
        await manager.start(editorContainerRef.current);

        if (manager.isUsingDiffEditor()) {
          diffEditorRef.current = manager.getDiffEditor();
          if (diffEditorRef?.current) {
            addListenersForDiff(diffEditorRef?.current, eventListeners);
          }
        } else {
          editorRef.current = manager.getEditor();
          setTimeout(() => {
            if (editorRef?.current) {
              addListeners(editorRef?.current, eventListeners);
              addEditorActions(manager.getMonaco(), editorRef?.current, editorActions);
              onMountEditor && onMountEditor?.(editorRef.current);
            }
          }, 1000);
        }
      };

      initializeWrapper();
    }

    const element = containerRef.current;
    if (manager && element && !element.classList.contains('mounted')) {
      if (element) {
        element.classList.add('mounted');
      }
    }

    const instance = managerRef?.current;
    return () => {
      if (instance) {
        if (!persistResourceOnUnmount) {
          instance.closeResource();
        }
        if (!persistManagerOnUnmount) {
          instance.dispose();
          diffEditorRef.current = null;
          editorRef.current = null;
          managerRef.current = null;
        }
      }
    };
  }, [
    eventListeners,
    editorActions,
    manager,
    onMountEditor,
    persistManagerOnUnmount,
    persistResourceOnUnmount,
  ]);

  return (
    <ContainerStyled ref={containerRef}>
      <Loading className="ide-loading" />

      <IDEStyled className={['ide-container', containerClassName ?? ''].filter(Boolean).join(' ')}>
        <div
          className={editorClassName}
          ref={editorContainerRef}
          style={style ?? { height: '100vh' }}
        />
      </IDEStyled>

      <div id={`monaco-suggest-application-root-${uuid}`} />
    </ContainerStyled>
  );
}

export default MateriaIDE;
