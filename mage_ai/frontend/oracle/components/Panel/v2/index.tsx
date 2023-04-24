import { PanelStyle } from './index.style';

type PanelProps = {
  children: any;
  fullHeight?: boolean;
  fullWidth?: boolean;
};

function Panel({
  children,
  fullHeight = false,
  fullWidth = true,
}: PanelProps) {
  return (
    <PanelStyle fullHeight={fullHeight} fullWidth={fullWidth}>
      {children}
    </PanelStyle>
  );
}

export default Panel;
