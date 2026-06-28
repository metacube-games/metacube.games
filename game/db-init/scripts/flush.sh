#!/bin/bash

source /env/.env

echo "Flushing database..."
if [ "$GAME_DB_NETWORK" == "tcp" ]; then
    keydb-cli --no-auth-warning -h $GAME_DB_HOST -p $GAME_DB_PORT -a $GAME_DB_PASSWORD flushdb > /dev/null
else
    keydb-cli --no-auth-warning -s $GAME_DB_SOCKET -a $GAME_DB_PASSWORD flushdb > /dev/null
fi
echo "Database flushed."
