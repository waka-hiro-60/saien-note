import fs from 'fs/promises';
await fs.copyFile('gallery.html', 'dist/index.html');
console.log('✓ gallery.html -> dist/index.html');
await fs.cp('public/img', 'dist/img', { recursive: true });
console.log('✓ public/img -> dist/img');
