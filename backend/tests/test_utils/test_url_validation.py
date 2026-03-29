"""Tests for webhook URL validation / SSRF protection."""

import pytest
from fastapi import HTTPException

from app.utils.url_validation import validate_webhook_url, is_safe_webhook_url


class TestValidateWebhookUrl:
    """Test SSRF protection in webhook URL validation."""

    def test_rejects_private_ipv4_loopback(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http://127.0.0.1:8080/hook")
        assert exc.value.status_code == 400
        assert "private or internal" in exc.value.detail

    def test_rejects_private_10_range(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http://10.0.0.1:6379/hook")
        assert exc.value.status_code == 400

    def test_rejects_private_172_range(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http://172.16.0.1/hook")
        assert exc.value.status_code == 400

    def test_rejects_private_192_range(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http://192.168.1.1/hook")
        assert exc.value.status_code == 400

    def test_rejects_aws_metadata(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http://169.254.169.254/latest/meta-data/")
        assert exc.value.status_code == 400

    def test_rejects_ipv6_loopback(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http://[::1]:8080/hook")
        assert exc.value.status_code == 400

    def test_rejects_localhost(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http://localhost:5432/hook")
        assert exc.value.status_code == 400

    def test_rejects_ftp_scheme(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("ftp://example.com/hook")
        assert exc.value.status_code == 400
        assert "scheme" in exc.value.detail

    def test_rejects_no_hostname(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("http:///path")
        assert exc.value.status_code == 400
        assert "hostname" in exc.value.detail

    def test_rejects_unresolvable_hostname(self):
        with pytest.raises(HTTPException) as exc:
            validate_webhook_url("https://this-domain-does-not-exist-xyz123.example/hook")
        assert exc.value.status_code == 400
        assert "resolved" in exc.value.detail

    def test_accepts_valid_https_url(self):
        result = validate_webhook_url("https://discord.com/api/webhooks/123/abc")
        assert result == "https://discord.com/api/webhooks/123/abc"

    def test_accepts_valid_http_url(self):
        result = validate_webhook_url("http://hooks.slack.com/services/T00/B00/xxx")
        assert result == "http://hooks.slack.com/services/T00/B00/xxx"


class TestIsSafeWebhookUrl:
    """Test the non-raising variant for batch jobs."""

    def test_returns_false_for_private_ip(self):
        assert is_safe_webhook_url("http://127.0.0.1/hook") is False

    def test_returns_false_for_metadata(self):
        assert is_safe_webhook_url("http://169.254.169.254/") is False

    def test_returns_true_for_valid_url(self):
        assert is_safe_webhook_url("https://discord.com/api/webhooks/123/abc") is True
