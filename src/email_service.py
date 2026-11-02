"""Transactional password-reset email delivery through Resend."""

from __future__ import annotations

from html import escape

import resend

from src.config import EMAIL_FROM, RESET_TOKEN_EXPIRE_MINUTES, RESEND_API_KEY


class EmailDeliveryError(RuntimeError):
    """Raised when Resend is unavailable or rejects the message."""


def send_password_reset_email(recipient: str, reset_url: str) -> None:
    """Send a mobile-friendly reset message without logging secrets or tokens."""
    if not RESEND_API_KEY:
        raise EmailDeliveryError("RESEND_API_KEY is not configured.")

    safe_url = escape(reset_url, quote=True)
    html_body = f"""\
<!doctype html>
<html lang="es">
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
  <body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif;color:#14231e">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:24px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border-radius:12px">
          <tr><td style="padding:32px 24px">
            <p style="margin:0;color:#176b4d;font-size:13px;font-weight:bold;letter-spacing:1px">TRACKFLOW</p>
            <h1 style="font-size:24px;line-height:1.3;margin:20px 0 12px">Restablece tu contraseña</h1>
            <p style="font-size:16px;line-height:1.6;margin:0 0 24px">Recibimos una solicitud para cambiar la contraseña de tu cuenta. El enlace caduca en {RESET_TOKEN_EXPIRE_MINUTES} minutos y solo puede utilizarse una vez.</p>
            <p style="margin:0 0 24px"><a href="{safe_url}" style="display:inline-block;background:#176b4d;color:#fff;text-decoration:none;font-weight:bold;padding:14px 20px;border-radius:8px">Restablecer Contraseña</a></p>
            <p style="font-size:13px;line-height:1.6;color:#52615b">Si no solicitaste este cambio, puedes ignorar este mensaje. No compartas este enlace.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>"""
    text_body = (
        "Restablece tu contraseña de TrackFlow usando este enlace. "
        f"Caduca en {RESET_TOKEN_EXPIRE_MINUTES} minutos y solo puede utilizarse una vez:\n\n"
        f"{reset_url}\n\nSi no solicitaste este cambio, ignora este mensaje."
    )

    try:
        resend.api_key = RESEND_API_KEY
        result = resend.Emails.send(
            {
                "from": EMAIL_FROM,
                "to": [recipient],
                "subject": "Restablece tu contraseña de TrackFlow",
                "html": html_body,
                "text": text_body,
            }
        )
        if isinstance(result, dict) and result.get("error"):
            raise EmailDeliveryError("Resend rejected the password-reset email.")
    except EmailDeliveryError:
        raise
    except Exception as error:
        raise EmailDeliveryError("Could not deliver password-reset email.") from error