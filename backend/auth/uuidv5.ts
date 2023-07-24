import { crypto } from "https://deno.land/std@0.195.0/crypto/crypto.ts";
/* Code taken in part from https://github.com/uuidjs/uuid. LICENSE BEGINS:
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2010-2020 Robert Kieffer and other contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
 * of the Software, and to permit persons to whom the Software is furnished to do
 * so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/** I wanted a native synchronous javascript uuid v5, no promises, no async. */
export function uuidv5(name: string, namespace: string): string {
  const ns = parse(namespace);
  const encoder = new TextEncoder();
  const data = new Uint8Array([...ns, ...encoder.encode(name)]);
  const hash = crypto.subtle.digestSync("SHA-1", data);
  const bytes = new Uint8Array(hash);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return unsafeStringify(bytes);
}

function parse(uuid: string): Uint8Array {
  let v;
  const bytes = new Uint8Array(16);

  // Parse ########-....-....-....-............
  bytes[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  bytes[1] = (v >>> 16) & 0xff;
  bytes[2] = (v >>> 8) & 0xff;
  bytes[3] = v & 0xff;

  // Parse ........-####-....-....-............
  bytes[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  bytes[5] = v & 0xff;

  // Parse ........-....-####-....-............
  bytes[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  bytes[7] = v & 0xff;

  // Parse ........-....-....-####-............
  bytes[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  bytes[9] = v & 0xff;

  // Parse ........-....-....-....-############
  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)
  bytes[10] = ((v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000) & 0xff;
  bytes[11] = (v / 0x100000000) & 0xff;
  bytes[12] = (v >>> 24) & 0xff;
  bytes[13] = (v >>> 16) & 0xff;
  bytes[14] = (v >>> 8) & 0xff;
  bytes[15] = v & 0xff;

  return bytes;
}

function unsafeStringify(arr: number[] | Uint8Array, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  return (
    byteToHex[arr[offset + 0]] +
    byteToHex[arr[offset + 1]] +
    byteToHex[arr[offset + 2]] +
    byteToHex[arr[offset + 3]] +
    "-" +
    byteToHex[arr[offset + 4]] +
    byteToHex[arr[offset + 5]] +
    "-" +
    byteToHex[arr[offset + 6]] +
    byteToHex[arr[offset + 7]] +
    "-" +
    byteToHex[arr[offset + 8]] +
    byteToHex[arr[offset + 9]] +
    "-" +
    byteToHex[arr[offset + 10]] +
    byteToHex[arr[offset + 11]] +
    byteToHex[arr[offset + 12]] +
    byteToHex[arr[offset + 13]] +
    byteToHex[arr[offset + 14]] +
    byteToHex[arr[offset + 15]]
  );
}

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
const byteToHex: string[] = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}
