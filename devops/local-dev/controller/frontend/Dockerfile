FROM node:latest

WORKDIR /app

RUN curl -fsSL https://bun.sh/install | bash

RUN ln -s $HOME/.bun/bin/bun /usr/local/bin/bun

COPY . .

RUN bun install

ENTRYPOINT ["bun", "dev", "--host"]
