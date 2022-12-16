import styled from 'styled-components';
import {
  FlexboxProps,
  MarginProps,
  PaddingProps,
  flexbox,
  space,
} from 'styled-system';

type FlexProps = {
  position?: string;
  right?: number;
  textOverflow?: boolean;
} & FlexboxProps & MarginProps & PaddingProps;

const Flex = styled.div<FlexProps>`
  display: flex;
  ${flexbox}
  ${space}

  ${props => props.position && `
    position: ${props.position};
  `}

  ${props => props.right && `
    right: ${props.right}px;
  `}

  ${props => props.textOverflow && `
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`;

export default Flex;
