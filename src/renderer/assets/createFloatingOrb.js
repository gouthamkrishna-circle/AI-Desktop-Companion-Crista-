// Crops the orb from orb.png and removes the outer black background, creating a transparent floating orb
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const srcPath = path.join(__dirname, 'orb.png');
const dstPath = path.join(__dirname, 'floating_orb.png');

const buf = fs.readFileSync(srcPath);
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);

let offset = 8;
const idatList = [];
while (offset < buf.length) {
  const len = buf.readUInt32BE(offset);
  const type = buf.toString('ascii', offset + 4, offset + 8);
  if (type === 'IDAT') idatList.push(buf.subarray(offset + 8, offset + 8 + len));
  offset += 12 + len;
}

const raw = zlib.inflateSync(Buffer.concat(idatList));
const rowSize = 1 + width * 4;

// Target dimensions for square orb
const targetSize = 360;
const targetRowSize = 1 + targetSize * 4;
const outRaw = Buffer.alloc(targetRowSize * targetSize);

const cx = 500;
const cy = 384;
const radius = 282;

for (let ty = 0; ty < targetSize; ty++) {
  const outRowOffset = ty * targetRowSize;
  outRaw[outRowOffset] = 0; // Filter None

  // Map ty (0 to targetSize) to src y (cy - radius to cy + radius)
  const sy = Math.round(cy - radius + (ty / targetSize) * (2 * radius));

  for (let tx = 0; tx < targetSize; tx++) {
    const outPx = outRowOffset + 1 + tx * 4;
    const sx = Math.round(cx - radius + (tx / targetSize) * (2 * radius));

    // Distance from center in normalized target coordinates
    const dtx = tx - targetSize / 2;
    const dty = ty - targetSize / 2;
    const dist = Math.sqrt(dtx * dtx + dty * dty);
    const maxRadius = targetSize * 0.49;

    if (dist <= maxRadius && sx >= 0 && sx < width && sy >= 0 && sy < height) {
      const srcPx = sy * rowSize + 1 + sx * 4;
      const r = raw[srcPx];
      const g = raw[srcPx + 1];
      const b = raw[srcPx + 2];

      outRaw[outPx + 0] = r;
      outRaw[outPx + 1] = g;
      outRaw[outPx + 2] = b;

      // Soft feather at edge
      if (dist > maxRadius - 4) {
        const factor = (maxRadius - dist) / 4;
        outRaw[outPx + 3] = Math.round(255 * factor);
      } else {
        outRaw[outPx + 3] = 255;
      }
    } else {
      // Completely transparent
      outRaw[outPx + 0] = 0;
      outRaw[outPx + 1] = 0;
      outRaw[outPx + 2] = 0;
      outRaw[outPx + 3] = 0;
    }
  }
}

// Encode to PNG
function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calcCrc(body), 0);
  return Buffer.concat([len, body, crc]);
}

function calcCrc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdrData = Buffer.alloc(13);
ihdrData.writeUInt32BE(targetSize, 0);
ihdrData.writeUInt32BE(targetSize, 4);
ihdrData[8] = 8;
ihdrData[9] = 6; // RGBA
ihdrData[10] = 0;
ihdrData[11] = 0;
ihdrData[12] = 0;
const ihdr = makeChunk('IHDR', ihdrData);

const compressed = zlib.deflateSync(outRaw);
const idat = makeChunk('IDAT', compressed);
const iend = makeChunk('IEND', Buffer.alloc(0));

const finalPng = Buffer.concat([signature, ihdr, idat, iend]);
fs.writeFileSync(dstPath, finalPng);
console.log('Successfully created floating_orb.png at:', dstPath);
