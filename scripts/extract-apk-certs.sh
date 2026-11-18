#!/usr/bin/env bash
# Extract only signing *certificate* SHA-256 digests, not public-key digests.
# apksigner prints either "Signer #1 ..." or "Signer (minSdkVersion=...) ...".
set -euo pipefail
awk '
  /^[[:space:]]*Signer .* certificate SHA-256 digest:/ {
    sub(/^[[:space:]]*Signer .* certificate SHA-256 digest:[[:space:]]*/, "")
    gsub(/[:[:space:]]/, "")
    print tolower($0)
  }
'
