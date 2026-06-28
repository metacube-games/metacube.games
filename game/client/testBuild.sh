#!/bin/bash

bun run build
bun i serve -g
serve -s dist/ -l 443
