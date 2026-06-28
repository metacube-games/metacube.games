FROM node:24-slim

WORKDIR /app

COPY . .

RUN npm install

RUN apt-get update && \
    apt-get install -y lsb-release wget make && \
    echo "deb https://download.keydb.dev/open-source-dist $(lsb_release -sc) main" | tee /etc/apt/sources.list.d/keydb.list && \
    wget -O /etc/apt/trusted.gpg.d/keydb.gpg https://download.keydb.dev/open-source-dist/keyring.gpg && \
    apt-get update && \
    apt-get install -y keydb-tools && \
    rm -rf /var/lib/apt/lists/*
