import ProjectType from '@interfaces/ProjectType';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { ComputeServiceEnum } from './constants';
import { isEmptyObject } from '@utils/hash';

export function getComputeServiceFromProject(project: ProjectType): ComputeServiceEnum {
  if (!isEmptyObject(project?.spark_config || {})) {
    if (!isEmptyObject(project?.emr_config || {})) {
      return ComputeServiceEnum.AWS_EMR;
    } else {
      return ComputeServiceEnum.STANDALONE_CLUSTER;
    }
  }
}

export function buildTable(rows) {
  return (
    <Table
      columnFlex={[
        null,
        1,
      ]}
      columns={[
        {
          uuid: 'Attribute',
        },
        {
          uuid: 'Value',
        },
      ]}
      rows={rows.map((arr) => [
        <Text
          key="attribute"
          monospace
          muted
          small
        >
          {arr[0]}
        </Text>,
        <Text
          key="value"
          monospace
          muted
          small
        >
          {arr[1]}
        </Text>,
      ])}
    />
  );
}
