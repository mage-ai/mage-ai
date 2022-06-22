import CodeEditor from '@components/CodeEditor';
import Spacing from '@oracle/elements/Spacing';

function Test() {
  return (
    <Spacing p={5}>
      <CodeEditor
        autoSave
        defaultValue={`import mysql.connector
import os
import pandas as pd


def query(sql):
    mydb = mysql.connector.connect(
      host='mage-development.cxj4djmtpwkx.us-west-2.rds.amazonaws.com',
      user='root',
      password=os.getenv('DB_PASSWORD'),
      database='materia_development',
    )
    mycursor = mydb.cursor()

    mycursor.execute(sql)

    return mycursor.fetchall()


def query_table(table_name):
    columns = [r[0] for r in query(f'DESCRIBE {table_name}')]
    rows = query(f'SELECT * FROM {table_name}')

    return pd.DataFrame(rows, columns=columns)


import mage_ai


# df = query_table('materia_development.model_with_versions')
# mage_ai.connect_data(df, 'model_with_versions')

df = query_table('materia_development.features_with_feature_sets')
mage_ai.connect_data(df, 'features_with_feature_sets')
        `}
        height="calc(100vh - 90px)"
        onSave={(value: string) => {
          console.log(`Saving...\n${value}`);
        }}
        width="calc(100vw - 90px)"
      />
    </Spacing>
  );
}

export default Test;
