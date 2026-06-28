#!/usr/bin/env bash
# Fetch the latest Cloudflare IP ranges and update both the geo block AND
# the set_real_ip_from directives in nginx.conf so they stay in sync.
# Run this whenever Cloudflare announces new IP ranges (https://www.cloudflare.com/ips/).
# Usage: ./scripts/refresh-cf-ips.sh
set -euo pipefail

NGINX_CONF="$(dirname "$0")/../config/nginx.conf"

# Fetch and validate that the response looks like CIDR ranges (one per line)
# before we overwrite anything — protects against a garbage response from
# Cloudflare's endpoint (rare but possible) bricking ingress.
fetch() {
    local url="$1"
    local data
    data=$(curl -fsSL "$url")
    if ! printf '%s\n' "$data" | grep -qE '^[0-9a-fA-F.:/]+$'; then
        echo "ERROR: response from $url does not look like CIDR ranges" >&2
        echo "$data" | head -5 >&2
        exit 1
    fi
    printf '%s\n' "$data"
}

IPV4=$(fetch "https://www.cloudflare.com/ips-v4/")
IPV6=$(fetch "https://www.cloudflare.com/ips-v6/")

GEO_BLOCK="    geo \$cloudflare_ip {
        default 0;
        # IPv4
$(printf '%s\n' "$IPV4" | sed 's|^|        |; s|$|  1;|')
        # IPv6
$(printf '%s\n' "$IPV6" | sed 's|^|        |; s|$|  1;|')
    }"

REAL_IP_BLOCK=$(
    {
        printf '%s\n' "$IPV4" "$IPV6" | sed 's|^|    set_real_ip_from |; s|$|;|'
        echo "    real_ip_header CF-Connecting-IP;"
        echo "    real_ip_recursive on;"
    }
)

TMP=$(mktemp)

# Replace the geo block, then the run of set_real_ip_from / real_ip_*
# directives that immediately follows it.
awk -v geo="$GEO_BLOCK" -v real_ip="$REAL_IP_BLOCK" '
    /geo \$cloudflare_ip \{/      { in_geo=1; print geo; next }
    in_geo && /^    \}/           { in_geo=0; next }
    in_geo                        { next }

    /^    set_real_ip_from /      { if (!real_ip_printed) { print real_ip; real_ip_printed=1 } next }
    /^    real_ip_header /        { next }
    /^    real_ip_recursive /     { next }

    { print }
' "$NGINX_CONF" > "$TMP"

mv "$TMP" "$NGINX_CONF"
echo "Updated $NGINX_CONF with latest Cloudflare IP ranges."
echo "Reload nginx to apply: docker exec nginx nginx -s reload"
