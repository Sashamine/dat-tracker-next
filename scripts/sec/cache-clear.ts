#!/usr/bin/env node
import fs from 'node:fs';

fs.rmSync('.cache/sec', { recursive: true, force: true });
console.log('cleared .cache/sec');
