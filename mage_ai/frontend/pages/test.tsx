import Browser from '@components/BlockBrowser';
import { BlockTypeEnum } from '@interfaces/BlockType';

function Test() {
  return (
    <div>
      <Browser
        defaultBlockType={BlockTypeEnum.DBT}
        onClickAction={opts => console.log(opts)}
      />
    </div>
  );
}

export default Test;
