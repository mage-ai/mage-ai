from urllib.parse import urlparse

from mage_ai.shared.constants import GCS_PREFIX, S3_PREFIX


def s3_url_path(path):
    if path.startswith(S3_PREFIX):
        s3_url = urlparse(path, allow_fragments=False)
        return s3_url.path.lstrip('/')
    return path


def gcs_url_path(path):
    if path.startswith(GCS_PREFIX):
        gcs_url = urlparse(path, allow_fragments=False)
        return gcs_url.path.lstrip('/')
    return path
