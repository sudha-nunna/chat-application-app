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

// Convert JPG/PNG input image to transparent PNG (remove pure white background)
const darkSource = 'C:/Users/User/.gemini/antigravity-ide/brain/8c508455-acba-42b1-9012-6cc1a5a4385d/.user_uploaded/media_1789653326058.png';
fs.copyFileSync(darkSource, 'c:/Users/User/Desktop/AI/chat-application-app/public/codegene-halo-dark.png');
console.log('✅ Updated codegene-halo-dark.png from exact dark mode image!');

// Copy exact light mode image
const lightSource = 'C:/Users/User/.gemini/antigravity-ide/brain/8c508455-acba-42b1-9012-6cc1a5a4385d/.user_uploaded/media_1789653326061.jpg';
fs.copyFileSync(lightSource, 'c:/Users/User/Desktop/AI/chat-application-app/public/codegene-halo-light.jpg');
fs.copyFileSync(lightSource, 'c:/Users/User/Desktop/AI/chat-application-app/public/codegene-halo-light.png');
console.log('✅ Updated codegene-halo-light.png from exact light mode image!');
