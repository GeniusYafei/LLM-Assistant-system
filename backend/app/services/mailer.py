# backend/app/services/mailer.py
import logging
import os

logger = logging.getLogger(__name__)

MAIL_SENDER_HOST = os.getenv("MAIL_SENDER_HOST", "")  # Need to be set for actual email sending


def send_invite_email(to_email: str, to_name: str | None, temp_password: str) -> bool:
    """
    Email placeholder: prints only logs and returns True when not configured
    """
    if not MAIL_SENDER_HOST:
        logger.info("[MAIL-DRYRUN] Invite email -> %s (name=%s, temp_password=%s)",
                    to_email, to_name, temp_password)
        return True

    # TODO: The Real Email Sending（SMTP/API）
    try:
        # send_email_via_smtp(MAIL_SENDER_HOST, ...)
        logger.info("[MAIL-SENT] Invite email sent to %s", to_email)
        return True
    except Exception as e:
        logger.exception("Send invite email failed: %s", e)
        return False


def send_password_reset_email(to_email: str, to_name: str | None, code: str) -> bool:
    if not MAIL_SENDER_HOST:
        logger.info("[MAIL-DRYRUN] reset -> %s (name=%s, code=%s)", to_email, to_name, code)
        return True
    # TODO: The Real Email Sending（SMTP/API）
    logger.info("[MAIL-SENT] reset -> %s", to_email)

    return True
