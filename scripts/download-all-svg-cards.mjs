import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const SUITS = [
  { appSuit: 'espada', repoSuit: 'swords' },
  { appSuit: 'basto', repoSuit: 'clubs' },
  { appSuit: 'oro', repoSuit: 'coins' },
  { appSuit: 'copa', repoSuit: 'cups' },
];

const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const outDir = path.resolve('public/cards');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TrucoApp/1.0' } }, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to get ${url}: status ${res.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Downloading all 40 high-res vector cards...');
  for (const suit of SUITS) {
    for (const num of NUMBERS) {
      const numStr = String(num).padStart(2, '0');
      const url = `https://raw.githubusercontent.com/gjenkins20/spanish-playing-cards-svg/main/card_${suit.repoSuit}_${numStr}.svg`;
      const dest = path.join(outDir, `${suit.appSuit}-${num}.svg`);
      process.stdout.write(`Downloading ${suit.appSuit}-${num}.svg... `);
      await downloadFile(url, dest);
      const size = fs.statSync(dest).size;
      console.log(`OK (${(size / 1024).toFixed(1)} KB)`);
    }
  }

  // Also download card_back.svg
  console.log('Downloading card_back.svg...');
  await downloadFile(
    'https://raw.githubusercontent.com/gjenkins20/spanish-playing-cards-svg/main/card_back.svg',
    path.join(outDir, 'back.svg')
  );
  console.log('All cards successfully downloaded!');
}

run().catch(console.error);
