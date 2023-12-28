import ApplicationForm from '../ApplicationForm';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import { ItemApplicationTypeEnum } from '@interfaces/CommandCenterType';

type ItemApplicationProps = {
  item: CommandCenterItemType;
};

function ItemApplication({
  item,
}: ItemApplicationProps) {
  const applicationType = item?.application?.application_type;

  if (ItemApplicationTypeEnum.FORM === applicationType) {
    return <ApplicationForm item={item} />
  }

  return null;
}

export default ItemApplication;
