import ApplicationForm from '../ApplicationForm';
import { ApplicationProps } from './constants';
import { CommandCenterItemType } from '@interfaces/CommandCenterType';
import { ItemApplicationTypeEnum } from '@interfaces/CommandCenterType';

function ItemApplication({
  ...props
}: ApplicationProps) {
  const applicationType = props?.item?.application?.application_type;

  if (ItemApplicationTypeEnum.FORM === applicationType) {
    return <ApplicationForm {...props} />
  }

  return null;
}

export default ItemApplication;
