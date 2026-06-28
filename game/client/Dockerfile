FROM node:latest

WORKDIR /app

RUN curl -fsSL https://bun.sh/install | bash

RUN ln -s $HOME/.bun/bin/bun /usr/local/bin/bun

RUN bun install --global npm-check-updates
