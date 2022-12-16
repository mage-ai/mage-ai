import styled from 'styled-components';
import { Slide, ToastContainer } from 'react-toastify';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

const ToastWrapper = styled.div`
  .Toastify__toast-container {
    margin-top: ${UNIT * 3}px;
    padding: 0 !important;
    width: 500px !important;
  }

  .Toastify__toast {
    border-radius: ${BORDER_RADIUS}px !important;
    font-family: Greycliff Medium, Helvetica Neue, Helvetica, sans-serif !important;
    font-size: 14px !important;
    line-height: 20px !important;
    margin-bottom: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    margin-top: ${UNIT * 2}px !important;
    min-height: 0 !important;
    padding: ${UNIT * 2}px !important;
  }

  .Toastify__toast-body {
    margin: 0 !important;
  }

  ${props => `
    .Toastify__toast--error {
      background: ${(props.theme.accent || dark.accent).negative} !important;
      color: ${(props.theme.content || dark.content).active} !important;
    }
    .Toastify__toast--info {
      background: ${(props.theme.accent || dark.accent).positive} !important;
      color: ${(props.theme.content || dark.content).active} !important;
    }
    .Toastify__toast--success {
      background: ${(props.theme.accent || dark.accent).positive} !important;
      color: ${(props.theme.content || dark.content).active} !important;
    }
    .Toastify__toast--warning {
      background: ${(props.theme.accent || dark.accent).warning} !important;
      color: ${(props.theme.content || dark.content).active} !important;
    }
  `}
`;

export default function Toast() {
  return (
    <ToastWrapper>
      <ToastContainer
        transition={Slide}
      />
    </ToastWrapper>
  );
}
