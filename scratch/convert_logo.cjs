const fs = require('fs');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const inputPath = 'c:/Users/User/Desktop/AI/chat-application-app/public/codegene-halo.png';
const buffer = fs.readFileSync(inputPath);

let offset = 8; // skip PNG signature
let width = 0, height = 0, bitDepth = 0, colorType = 0;
let idatChunks = [];

while (offset < buffer.length) {
  const length = buffer.readUInt32BE(offset);
  const type = buffer.toString('ascii', offset + 4, offset + 8);
  const data = buffer.slice(offset + 8, offset + 8 + length);
  
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    bitDepth = data[8];
    colorType = data[9];
  } else if (type === 'IDAT') {
    idatChunks.push(data);
  }
  offset += 12 + length;
}

console.log(`Processing PNG: ${width}x${height}, bitDepth=${bitDepth}, colorType=${colorType}`);

const compressedAll = Buffer.concat(idatChunks);
const rawData = zlib.inflateSync(compressedAll);

const bytesPerPixel = colorType === 6 ? 4 : 3;

// We will construct darkRaw (white/cyan on transparent) and lightRaw (black on transparent)
const rowSize = 1 + width * 4;
const darkRaw = Buffer.alloc(height * rowSize);
const lightRaw = Buffer.alloc(height * rowSize);

let srcIdx = 0;

for (let y = 0; y < height; y++) {
  const rowStart = y * rowSize;
  const filterType = rawData[srcIdx++];
  
  darkRaw[rowStart] = filterType;
  lightRaw[rowStart] = filterType;
  
  for (let x = 0; x < width; x++) {
    const r = rawData[srcIdx];
    const g = rawData[srcIdx + 1];
    const b = rawData[srcIdx + 2];
    const a = bytesPerPixel === 4 ? rawData[srcIdx + 3] : 255;
    srcIdx += bytesPerPixel;

    const p = rowStart + 1 + x * 4;
    const brightness = (r + g + b) / 3;

    let alpha = 0;
    if (brightness >= 25) {
      alpha = Math.min(255, Math.floor((brightness - 15) * 2.8));
    }

    // Dark mode logo: keep original white/cyan glowing pixels with transparent background
    darkRaw[p] = r;
    darkRaw[p + 1] = g;
    darkRaw[p + 2] = b;
    darkRaw[p + 3] = alpha;

    // Light mode logo: pure solid black outlines (#000000) with transparent background
    lightRaw[p] = 0;     // Red
    lightRaw[p + 1] = 0; // Green
    lightRaw[p + 2] = 0; // Blue
    lightRaw[p + 3] = alpha; // Alpha
  }
}

function makePngBuffer(w, h, rawPixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA

  const ihdrChunk = Buffer.alloc(4 + 13 + 4);
  ihdrChunk.write('IHDR', 0);
  ihdr.copy(ihdrChunk, 4);
  ihdrChunk.writeUInt32BE(crc32(ihdrChunk.slice(0, 17)), 17);

  const deflated = zlib.deflateSync(rawPixels);
  const idatChunk = Buffer.alloc(4 + deflated.length + 4);
  idatChunk.write('IDAT', 0);
  deflated.copy(idatChunk, 4);
  idatChunk.writeUInt32BE(crc32(idatChunk.slice(0, 4 + deflated.length)), 4 + deflated.length);

  const iendChunk = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrLenBuf = Buffer.alloc(4); ihdrLenBuf.writeUInt32BE(13, 0);
  const idatLenBuf = Buffer.alloc(4); idatLenBuf.writeUInt32BE(deflated.length, 0);

  return Buffer.concat([sig, ihdrLenBuf, ihdrChunk, idatLenBuf, idatChunk, iendChunk]);
}

const darkPng = makePngBuffer(width, height, darkRaw);
fs.writeFileSync('c:/Users/User/Desktop/AI/chat-application-app/public/codegene-halo-dark.png', darkPng);
console.log('✅ Generated codegene-halo-dark.png cleanly!');

const lightPng = makePngBuffer(width, height, lightRaw);
fs.writeFileSync('c:/Users/User/Desktop/AI/chat-application-app/public/codegene-halo-light.png', lightPng);
console.log('✅ Generated codegene-halo-light.png cleanly!');
