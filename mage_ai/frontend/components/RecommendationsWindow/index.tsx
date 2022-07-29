import FlexContainer from '@oracle/components/FlexContainer';
import {
  WindowContainerStyle,
  WindowContentStyle,
  WindowFooterStyle,
  WindowHeaderStyle,
} from './index.style';

type RecommendationsWindowProps = {
  children?: JSX.Element;
};

function RecommendationsWindow({
  children,
}: RecommendationsWindowProps) {
  return (
    <>
      {children}
    </>
  );
}

export default RecommendationsWindow;
