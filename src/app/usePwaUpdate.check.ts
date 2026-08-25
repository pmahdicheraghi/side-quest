/// <reference types="node" />

import assert from 'node:assert/strict';
import { installedWorkerAction } from './usePwaUpdate.ts';

const currentBuild = '1.4.3+current';
const currentWorker = `https://example.com/sw.js?v=${encodeURIComponent(currentBuild)}`;

assert.equal(installedWorkerAction(currentWorker, currentBuild, false), 'none');
assert.equal(installedWorkerAction(currentWorker, currentBuild, true), 'activate');
assert.equal(installedWorkerAction('https://example.com/sw.js?v=1.4.4%2Bnext', currentBuild, true), 'prompt');

console.log('PWA update policy checks passed.');
