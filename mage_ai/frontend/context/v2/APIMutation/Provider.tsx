import ErrorManager from './ErrorManager';
import Loading from '@mana/components/Loading';
import React, { useContext, useState, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import styles from '@styles/scss/components/Error/API/ErrorManager.module.scss';
import stylesButton from '@styles/scss/elements/Button/Button.module.scss';
import { APIErrorType, APIMutationContext, APIMutationProviderProps, TargetType } from './Context';
import { ElementRoleEnum, LoadingStyle } from '@mana/shared/types';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';
import { isDebug } from '@utils/environment';

const ROOT_ID = 'api-mutation-root';

export const APIMutationProvider: React.FC<APIMutationProviderProps> = ({ base, children }) => {
  const themeContext = useContext(ThemeContext);
  const errorRef = useRef<APIErrorType>(null);
  const errorElementRef = useRef<HTMLElement | null>(null);
  const rootRef = useRef<Root | null>(null);

  const [target, setTarget] = useState<TargetType | null>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  const loadingStyle = useMemo(() => target?.target?.dataset?.loadingStyle, [target]);

  function renderTarget(target: TargetType) {
    setTarget(target);

    if (LoadingStyle.INLINE === target?.target?.dataset?.loadingStyle) {
      target?.target?.classList?.add(stylesButton.loading);
    }
  }

  function dismissTarget() {
    target?.target?.classList?.remove(stylesButton.loading);
    setTarget(null);
  }

  function dismissError() {
    dismissTarget();
    errorRef.current = null;
    rootRef?.current && (rootRef.current as any).render(null);
  }

  function renderError(error: APIErrorType, retry?: (event: any) => void) {
    errorElementRef.current = document.getElementById(ROOT_ID);

    (rootRef as { current: any }).current ||= createRoot(errorElementRef.current);
    dismissError();

    errorRef.current = error;
    (rootRef.current as any).render(
      <ThemeProvider theme={themeContext}>
        <ErrorManager
          dismissError={dismissError}
          errorRef={errorRef}
          key={String(new Date())}
          retry={retry}
        />
      </ThemeProvider>,
    );

    // isDebug() && console.error(errorRef.current);
  }

  return (
    <APIMutationContext.Provider
      value={{ dismissError, dismissTarget, renderError, renderTarget } as any}
    >
      <>
        {children}
        {base && <div id={ROOT_ID} />}

        {target &&
          LoadingStyle.INLINE !== loadingStyle &&
          ReactDOM.createPortal(
            <div
              className={styles.target}
              ref={targetRef}
              style={{
                height: target?.content ? 'inherit' : 2,
                left: target.rect.left,
                top: target.rect.top + target.rect.height,
                width: target.rect.width,
              }}
            >
              {!target.content && <Loading />}
              {target.content}
            </div>,
            document.body,
          )}
      </>
    </APIMutationContext.Provider>
  );
};
