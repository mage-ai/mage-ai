from typing import Optional

from cryptography.fernet import Fernet

from mage_ai.settings.server import EXECUTION_OUTPUT_VARIABLES_SECRET_KEY


def encrypt_secret(secret: str, key: Optional[str] = None) -> bytes:
    cipher_suite = __get_cipher_suite(key)
    encrypted_secret = cipher_suite.encrypt(secret.encode('utf-8'))
    return encrypted_secret


def decrypt_secret(encrypted_secret: bytes, key: Optional[str] = None) -> str:
    cipher_suite = __get_cipher_suite(key)
    decrypted_secret = cipher_suite.decrypt(encrypted_secret).decode('utf-8')
    return decrypted_secret


def __get_cipher_suite(key: Optional[str] = None) -> Fernet:
    return Fernet(key or EXECUTION_OUTPUT_VARIABLES_SECRET_KEY or Fernet.generate_key())
