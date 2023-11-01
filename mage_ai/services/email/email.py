import smtplib
from email.message import EmailMessage

from mage_ai.services.email.config import EmailConfig


def send_email(
    config: EmailConfig,
    subject: str = None,
    message: str = None,
    verbose: bool = True,
):
    if subject is None or message is None:
        return
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = config.smtp_mail_from
    msg['To'] = ', '.join(config.to_emails)
    msg.set_content(message)
    if verbose:
        print(msg)
    server = smtplib.SMTP(config.smtp_host, config.smtp_port)
    if config.smtp_user and config.smtp_password:
        server.starttls()
        server.login(config.smtp_user, config.smtp_password)
    server.send_message(msg)
    server.quit()
    if verbose:
        print('Successfully sent the mail.')
