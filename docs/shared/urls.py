from mage_ai.shared.constants import S3_PREFIX
from urllib.parse import urlparse


def s3_url_path(path):
    if path.startswith(S3_PREFIX):
        s3_url = urlparse(path, allow_fragments=False)
        return s3_url.path.lstrip('/')
    return path
