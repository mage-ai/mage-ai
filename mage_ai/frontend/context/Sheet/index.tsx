import React, {
  createContext,
  useContext,
  useReducer,
} from 'react';
import styled from 'styled-components';
import { CSSTransition } from 'react-transition-group';

import { HEADER_HEIGHT } from '@components/constants';
import { initialState, reducer } from './reducer';

export const SheetContext = createContext({});

type SheetProviderProps = {
  children?: any;
};

const SHEET_WIDTH = 500;

const ContainerStyle = styled.div`
  .global-sheet-enter-active {
    left: -${SHEET_WIDTH}px;
    opacity: 0;
    transition: all 500ms cubic-bezier(0, 1, 0, 1);
  }

  .global-sheet-enter-done {
    left: 0;
    opacity: 1;
    transition: all 500ms cubic-bezier(0, 1, 0, 1);
  }

  .global-sheet-exit {
    left: 0;
    opacity: 1;
  }
  .global-sheet-exit-active {
    transition: all 200ms linear;
  }
  .global-sheet-exit-done {
    left: -${SHEET_WIDTH}px;
    opacity: 0;
    transition: all 200ms linear;
  }
`;

const SheetStyle = styled.div`
  background-color: red;
  left: -${SHEET_WIDTH}px;
  position: fixed;
  top: ${HEADER_HEIGHT}px;
  width: ${SHEET_WIDTH}px;
  z-index: 151;
`;

export const SheetProvider = ({ children }: SheetProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { visible } = state;

  return (
    <SheetContext.Provider value={[state, dispatch]}>
      {children}

      <ContainerStyle>
        <CSSTransition
          classNames="global-sheet"
          in={visible}
          timeout={300}
        >
          <SheetStyle>
            Hello
          </SheetStyle>
        </CSSTransition>
      </ContainerStyle>
    </SheetContext.Provider>
  );
};

export function useSheet() {
  const context = useContext(SheetContext);
  if (context === undefined) {
    throw new Error('useSheet must be used within a SheetProvider.');
  }

  return context;
}
