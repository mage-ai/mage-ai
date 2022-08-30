import { SubheaderStyle } from './index.style';

type SubheaderProps = {
  children?: any;
};

function Subheader({
  children,
}: SubheaderProps) {
  return (
    <SubheaderStyle>
      {children}
    </SubheaderStyle>
  );
}

export default Subheader;
