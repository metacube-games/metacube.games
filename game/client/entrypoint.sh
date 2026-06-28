#!/bin/sh

if [ "$SSL" = "true" ]; then
  exec nginx -c /etc/nginx/nginx-ssl.conf -g "daemon off;"
else
  exec nginx -g "daemon off;"
fi
