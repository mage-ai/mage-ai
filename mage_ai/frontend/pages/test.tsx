import api from '@api';
import useCustomDesign from '@utils/models/customDesign/useCustomDesign';

function Test() {
  const {
    designs,
  } = useCustomDesign();

  console.log(designs)

  return (
    <div>

    </div>
  );
}

export default Test;
