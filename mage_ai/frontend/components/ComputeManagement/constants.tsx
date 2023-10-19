import AmazonWebServicesEMR from '@oracle/icons/custom/AmazonWebServicesEMR';
import { EMRConfigType, SparkConfigType } from '@interfaces/ProjectType';
import { TripleBoxes } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

const ICON_SIZE = 8 * UNIT;

export type ObjectAttributesType = {
  emr_config?: EMRConfigType
  remote_variables_dir?: string;
  spark_config?: SparkConfigType;
};

export enum ComputeServiceEnum {
  AWS_EMR = 'AWS_EMR',
  STANDALONE_CLUSTER = 'STANDALONE_CLUSTER',
}

export enum MainNavigationTabEnum {
  CONNECTION = 'CONNECTION',
  RESOURCES = 'RESOURCES',
  MONITORING = 'MONITORING',
  SYSTEM = 'SYSTEM',
}

export const MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING = {
  [MainNavigationTabEnum.CONNECTION]: 'Connection',
  [MainNavigationTabEnum.RESOURCES]: 'Resources',
  [MainNavigationTabEnum.MONITORING]: 'Monitoring',
  [MainNavigationTabEnum.SYSTEM]: 'System',
};

export const COMPUTE_SERVICE_DISPLAY_NAME = {
  [ComputeServiceEnum.AWS_EMR]: 'AWS EMR',
  [ComputeServiceEnum.STANDALONE_CLUSTER]: 'Standalone cluster',
};

export const COMPUTE_SERVICE_KICKER = {
  [ComputeServiceEnum.AWS_EMR]: 'Spark',
  [ComputeServiceEnum.STANDALONE_CLUSTER]: 'Spark',
};

export const COMPUTE_SERVICE_RENDER_ICON_MAPPING = {
  [ComputeServiceEnum.AWS_EMR]: (
    size: number = ICON_SIZE,
  ) => <AmazonWebServicesEMR height={size} />,
  [ComputeServiceEnum.STANDALONE_CLUSTER]: (
    size: number = ICON_SIZE,
  ) => <TripleBoxes size={size} warning />
};

export const COMPUTE_SERVICES: {
  buildPayload: (data?: ObjectAttributesType) => ObjectAttributesType;
  displayName: string;
  documentationHref: string;
  kicker: string;
  renderIcon: () => any;
  uuid: string;
}[] = [
  {
    buildPayload: (data: ObjectAttributesType) => ({
      emr_config: null,
      spark_config: {
        app_name: '',
        spark_master: 'local',
        ...data?.spark_config,
      },
    }),
    displayName: COMPUTE_SERVICE_DISPLAY_NAME[ComputeServiceEnum.STANDALONE_CLUSTER],
    documentationHref: 'https://docs.mage.ai/integrations/spark-pyspark#standalone-spark-cluster',
    kicker: COMPUTE_SERVICE_KICKER[ComputeServiceEnum.STANDALONE_CLUSTER],
    renderIcon: COMPUTE_SERVICE_RENDER_ICON_MAPPING[ComputeServiceEnum.STANDALONE_CLUSTER],
    uuid: ComputeServiceEnum.STANDALONE_CLUSTER,
  },
  {
    buildPayload: (data: ObjectAttributesType) => ({
      emr_config: {
        master_instance_type: '',
        ...data?.emr_config,
      },
      spark_config: {
        app_name: '',
        ...data?.spark_config,
      },
    }),
    displayName: COMPUTE_SERVICE_DISPLAY_NAME[ComputeServiceEnum.AWS_EMR],
    documentationHref: 'https://docs.mage.ai/integrations/spark-pyspark#aws',
    kicker: COMPUTE_SERVICE_KICKER[ComputeServiceEnum.AWS_EMR],
    renderIcon: COMPUTE_SERVICE_RENDER_ICON_MAPPING[ComputeServiceEnum.AWS_EMR],
    uuid: ComputeServiceEnum.AWS_EMR,
  },
];

export const SHARED_TEXT_PROPS: {
  default: boolean;
  monospace: boolean;
  preWrap: boolean;
  small: boolean;
} = {
  default: true,
  monospace: true,
  preWrap: true,
  small: true,
};
