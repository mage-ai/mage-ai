import os


DEBUG = os.getenv('DEBUG', False)
QUERY_API_KEY = 'api_key'

"""
import secrets
secrets.token_urlsafe()

Make sure this value is the same in mage_ai/frontend/api/constants.ts
"""
OAUTH2_APPLICATION_CLIENT_ID = 'zkWlN0PkIKSN0C11CfUHUj84OT5XOJ6tDZ6bDRO2'
DISABLE_NOTEBOOK_EDIT_ACCESS = os.getenv('DISABLE_NOTEBOOK_EDIT_ACCESS', False)

REQUIRE_USER_AUTHENTICATION = os.getenv('REQUIRE_USER_AUTHENTICATION', False)
AUTHENTIFICATION_MODE = os.getenv('AUTHENTIFICATION_MODE', 'LOCAL')
LDAP_SERVER = os.getenv('LDAP_SERVER', 'ldaps://127.0.0.1:1636')
LDAP_BIND_DN = os.getenv('LDAP_BIND_DN', 'cd=admin,dc=example,dc=org')
LDAP_BIND_PASSWORD = os.getenv('LDAP_BIND_PASSWORD', 'admin_password')
LDAP_BASE_DN = os.getenv('LDAP_BASE_DN', 'dc=example,dc=org')
LDAP_AUTHENTICATATION_FILTER = os.getenv('LDAP_AUTHENTICATATION_FILTER',
                                         '(&(|(objectClass=Pers)(objectClass=gro))(cn={username}))')
LDAP_AUTORIZATION_FILTER = os.getenv('LDAP_AUTORIZATION_FILTER',
                                     '(&(objectClass=groupOfNames)(cn=group)(member={user_dn}))')
LDAP_ADMIN_USERNAME = os.getenv('LDAP_ADMIN_USERNAME', 'admin')
