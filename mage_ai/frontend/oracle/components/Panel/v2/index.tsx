import { PanelStyle } from './index.style';

type PanelProps = {
  children: any;
  fullWidth?: boolean;
};

function Panel({
  children,
  fullWidth = true,
}: PanelProps) {
  return (
    <PanelStyle fullWidth={fullWidth}>
      {children}
    </PanelStyle>
  );
}

export default Panel;
