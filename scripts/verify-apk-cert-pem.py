#!/usr/bin/env python3
"""Verify every certificate exported by apksigner against a pinned SHA-256.

The apksigner exit code is checked by the calling workflow; this script checks
only the signer certificates, avoiding text labels that differ across SDKs.
"""
import hashlib
from pathlib import Path
import re
import ssl
import sys


def verify(content: str, expected_fingerprint: str) -> None:
    expected = re.sub(r"[:\s]", "", expected_fingerprint).lower()
    if re.fullmatch(r"[0-9a-f]{64}", expected) is None:
        raise ValueError("Approved signing fingerprint is not valid SHA-256")

    certificates = re.findall(
        r"-----BEGIN CERTIFICATE-----.*?-----END CERTIFICATE-----",
        content,
        flags=re.DOTALL,
    )
    if not certificates:
        raise ValueError("apksigner did not output any PEM signing certificates")

    for cert in certificates:
        try:
            der = ssl.PEM_cert_to_DER_cert(cert)
        except ValueError as error:
            raise ValueError("apksigner returned malformed PEM certificate") from error
        actual = hashlib.sha256(der).hexdigest()
        if actual != expected:
            raise ValueError("APK signing certificate does not match the approved keystore")

    print(f"Verified {len(certificates)} APK signing certificate(s) against approved key")


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: verify-apk-cert-pem.py APKSIGNER_OUTPUT EXPECTED_SHA256", file=sys.stderr)
        return 2
    try:
        verify(Path(sys.argv[1]).read_text(encoding="utf-8"), sys.argv[2])
    except (OSError, ValueError) as error:
        print(f"APK signing verification failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
