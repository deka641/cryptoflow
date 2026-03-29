"""Webhook URL validation with SSRF protection."""

import ipaddress
import socket
from urllib.parse import urlparse

from fastapi import HTTPException, status


_BLOCKED_RANGES = [
    # AWS metadata / link-local
    ipaddress.ip_network("169.254.0.0/16"),
]


def validate_webhook_url(url: str) -> str:
    """Validate a webhook URL and reject private/internal addresses.

    Raises HTTPException(400) if the URL is invalid or targets a private network.
    Returns the validated URL unchanged.
    """
    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL scheme — only http and https are allowed",
        )

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL — missing hostname",
        )

    # Resolve hostname to IP addresses
    try:
        addr_infos = socket.getaddrinfo(hostname, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid URL — hostname could not be resolved",
        )

    for family, _, _, _, sockaddr in addr_infos:
        ip_str = sockaddr[0]
        try:
            addr = ipaddress.ip_address(ip_str)
        except ValueError:
            continue

        if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid URL — private or internal addresses are not allowed",
            )

        for blocked in _BLOCKED_RANGES:
            if addr in blocked:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid URL — private or internal addresses are not allowed",
                )

    return url


def is_safe_webhook_url(url: str) -> bool:
    """Check if a webhook URL is safe without raising exceptions.

    Used by batch jobs for defense-in-depth validation before outbound requests.
    Returns True if safe, False if blocked.
    """
    try:
        validate_webhook_url(url)
        return True
    except (HTTPException, Exception):
        return False
