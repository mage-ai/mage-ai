import os

import gnupg


def gpg_decrypt_to_file(gpg, src_file_path, decrypted_path, passphrase):
    with open(src_file_path, 'rb') as file_obj:
        gpg.decrypt_file(file_obj, output=decrypted_path, passphrase=passphrase)
    return decrypted_path


def initialize_gpg(key, gnupghome):
    gpg = gnupg.GPG(gnupghome=gnupghome)
    gpg.import_keys(key)
    return gpg


def gpg_decrypt(src_file_path, output_path, key, gnupghome, passphrase):
    gpg_filename = os.path.basename(src_file_path)
    decrypted_filename = os.path.splitext(gpg_filename)[0]
    decrypted_path = f'{output_path}/{decrypted_filename}'

    gpg = initialize_gpg(key, gnupghome)
    return gpg_decrypt_to_file(gpg, src_file_path, decrypted_path, passphrase)
