import { PanelStyle } from './index.style';

type PanelProps = {
  children: any;
}

function Panel({
  children,
}: PanelProps) {
  return (
    <PanelStyle>
      {children}
    </PanelStyle>
  );
}

export default Panel;
