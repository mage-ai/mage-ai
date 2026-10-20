from dataclasses import dataclass
from typing import List

from mage_ai.shared.config import BaseConfig


@dataclass
class EmailConfig(BaseConfig):
    smtp_host: str
    smtp_mail_from: str
    smtp_user: str = None
    smtp_password: str = None
    smtp_starttls: bool = True
    smtp_ssl: bool = False
    smtp_port: int = 587
    to_emails: List[str] = None

    @property
    def is_valid(self) -> bool:
        return len(self.to_emails or []) > 0
