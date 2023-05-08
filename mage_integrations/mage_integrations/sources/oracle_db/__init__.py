from mage_integrations.sources.base import Source, main
import cx_Oracle


class OracleDB(Source):
    @property
    def host(self) -> str:
        return self.config['host']

    @property
    def port(self) -> str:
        return self.config['port']

    @property
    def sid(self) -> str:
        return self.config['sid']

    @property
    def user(self) -> str:
        return self.config['user']

    @property
    def password(self) -> str:
        return self.config['password']

    @property
    def database(self) -> str:
        return self.config['database']

    def make_dsn(self, config):
        return cx_Oracle.makedsn(self.host, self.port, self.sid)

    def build_client(self):
        self.logger.info(f"Testing connected to Oracle Database: {self.make_dsn}")
        connection = cx_Oracle.connect(user="system", password="123456", dsn="oracle-db:1521/orclpdb1",
                                       encoding="UTF-8")
        conn = cx_Oracle.connect(self.user, self.password, self.make_dsn)
        return conn

    def test_connection(self):
        conn = self.build_client()
        cursor = conn.cursor()
        return cursor.execute("SELECT table_name FROM user_tables;")


if __name__ == '__main__':
    main(OracleDB)
