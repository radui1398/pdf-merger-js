import WebMerger from '@radui1398/pdf-merger-js';
import WebAlias from '@radui1398/pdf-merger-js/web';
import BrowserAlias from '@radui1398/pdf-merger-js/browser';
import { PDFMergerBase, parsePagesString } from '@radui1398/pdf-merger-js/core';
import NodeMerger from '@radui1398/pdf-merger-js-node';
import { Buffer } from 'node:buffer';

const web = new WebMerger();
const bytes: Promise<Uint8Array> = web.saveAsBuffer();
const blob: Promise<Blob> = web.saveAsBlob();
web.add(new File([], 'test.pdf'), [1]);
web.setMetadata({ title: 'Test' });
new WebAlias().save('merged');
new BrowserAlias({ ignoreEncryption: true }).reset();
new PDFMergerBase().add(new Uint8Array(), parsePagesString('1-3'));
const node = new NodeMerger();
const buffer: Promise<Buffer> = node.saveAsBuffer();
node.add(Buffer.from([]));
node.add('input.pdf');
node.save(new URL('file:///tmp/output.pdf'));
void [bytes, blob, buffer];

// @ts-expect-error The browser API does not return a Node Buffer.
const nodeBufferFromWeb: Promise<Buffer> = web.saveAsBuffer();
// @ts-expect-error Blob output is only available on the browser API.
node.saveAsBlob();
// @ts-expect-error Page selectors do not accept booleans.
web.add(new Uint8Array(), true);
void nodeBufferFromWeb;

web.add(new Uint8Array(), null, { timeoutMs: 1000, signal: new AbortController().signal });
node.add('input.pdf', '1-2', { timeoutMs: 0 });
// @ts-expect-error Timeout must be numeric.
web.add(new Uint8Array(), null, { timeoutMs: '1000' });
