import { ExecutionResultType } from './EventStreamType';

export enum VariableTypeEnum {
  CUSTOM_OBJECT = 'custom_object',
  DATAFRAME = 'dataframe',
  DATAFRAME_ANALYSIS = 'dataframe_analysis',
  DICTIONARY_COMPLEX = 'dictionary_complex',
  GEO_DATAFRAME = 'geo_dataframe',
  ITERABLE = 'iterable',
  LIST_COMPLEX = 'list_complex',
  MATRIX_SPARSE = 'matrix_sparse',
  MODEL_SKLEARN = 'model_sklearn',
  MODEL_XGBOOST = 'model_xgboost',
  POLARS_DATAFRAME = 'polars_dataframe',
  SERIES_PANDAS = 'series_pandas',
  SERIES_POLARS = 'series_polars',
  SPARK_DATAFRAME = 'spark_dataframe',
}

export enum EnvironmentTypeEnum {
  CODE = 'code',
  PIPELINE = 'pipeline',
}

export enum EnvironmentUUIDEnum {
  EXECUTION = 'execution',
}

export interface EnvironmentType {
  environment_variables?: Record<string, string>;
  type: EnvironmentTypeEnum;
  uuid: string | EnvironmentUUIDEnum;
  variables?: Record<string, string>;
}

export interface OutputType {
  data: string[];
  type: VariableTypeEnum;
  uuid: string;
}

export interface ExecutionOutputType {
  absolute_path: string;
  environment: EnvironmentType;
  messages: ExecutionResultType[];
  namespace: string;
  output?: OutputType[];
  path: string;
  uuid: string;
}
