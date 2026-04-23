/**
 * Henter siste innlegg fra Instagram via Instagram Graph API (Meta),
 * laster ned bilder til images/gallery/auto/ og skriver data/gallery.json
 *
 * KRAV FRA META (offisielt API):
 * - Instagram må være «profesjonell»: Creator ELLER Business (ikke vanlig privat personkonto).
 * - Kontoen må være koblet til en Facebook-side du administrerer.
 * - Tilgangstoken med rettigheter til å lese /{instagram-business-account-id}/media
 *
 * En helt privat personlig konto uten profesjonell profil kan ikke bruke dette API-et.
 * Da: manuell oppdatering av data/gallery.json, eller tredjeparts-widget (f.eks. Elfsight).
 *
 * Secrets i GitHub: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID
 * Valgfritt: INSTAGRAM_LIMIT (standard 9)
 *
 * @see https://developers.facebook.com/docs/instagram-platform/instagram-graph-api
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const USER_ID = process.env.INSTAGRAM_USER_ID;
const LIMIT = Math.min(25, Math.max(1, parseInt(process.env.INSTAGRAM_LIMIT || '9', 10)));
const API_VERSION = process.env.INSTAGRAM_API_VERSION || 'v21.0';

function graphUrl(igPath, searchParams) {
  const u = new URL(`https://graph.facebook.com/${API_VERSION}/${igPath}`);
  u.searchParams.set('access_token', TOKEN);
  for (const [k, v] of Object.entries(searchParams || {})) {
    if (v != null && v !== '') u.searchParams.set(k, String(v));
  }
  return u;
}

async function graphGet(igPath, searchParams) {
  const u = graphUrl(igPath, searchParams);
  const res = await fetch(u);
  const json = await res.json();
  if (!res.ok || json.error) {
    const msg = json.error ? JSON.stringify(json.error) : JSON.stringify(json);
    throw new Error(`Graph API feil: ${msg}`);
  }
  return json;
}

async function downloadFile(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Nedlasting feilet HTTP ${res.status}: ${url.slice(0, 80)}…`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
}

function emptyAutoDir() {
  const autoDir = path.join(ROOT, 'images', 'gallery', 'auto');
  fs.mkdirSync(autoDir, { recursive: true });
  for (const f of fs.readdirSync(autoDir)) {
    if (f === '.gitkeep') continue;
    fs.unlinkSync(path.join(autoDir, f));
  }
}

function collectImageJobs(mediaItems) {
  const jobs = [];
  for (const m of mediaItems) {
    if (!m) continue;
    if (m.media_type === 'IMAGE' && m.media_url) {
      jobs.push({ permalink: m.permalink, caption: m.caption, url: m.media_url });
    } else if (m.media_type === 'CAROUSEL_ALBUM' && m.children?.data?.length) {
      for (const c of m.children.data) {
        if (c.media_type === 'IMAGE' && c.media_url) {
          jobs.push({ permalink: m.permalink, caption: m.caption, url: c.media_url });
        }
      }
    } else if (m.media_type === 'VIDEO') {
      const thumb = m.thumbnail_url || m.media_url;
      if (thumb) jobs.push({ permalink: m.permalink, caption: m.caption, url: thumb });
    }
  }
  return jobs.slice(0, LIMIT);
}

function altFromCaption(caption) {
  if (!caption || typeof caption !== 'string') return 'Bilde fra Instagram';
  const line = caption.split('\n')[0].trim();
  return line.slice(0, 200) || 'Bilde fra Instagram';
}

async function main() {
  if (!TOKEN || !USER_ID) {
    throw new Error('Mangler INSTAGRAM_ACCESS_TOKEN eller INSTAGRAM_USER_ID i miljøet.');
  }

  const fields = [
    'id',
    'caption',
    'media_type',
    'media_url',
    'permalink',
    'thumbnail_url',
    'timestamp',
    'children{media_type,media_url,thumbnail_url}',
  ].join(',');

  const first = await graphGet(`${USER_ID}/media`, {
    fields,
    limit: '25',
  });

  const mediaItems = first.data || [];
  const jobs = collectImageJobs(mediaItems);

  if (!jobs.length) {
    console.warn('Ingen bilder funnet (sjekk konto, token og at det finnes publiserte innlegg).');
  }

  emptyAutoDir();

  const images = [];
  let n = 0;
  for (const job of jobs) {
    n += 1;
    const ext = job.url.toLowerCase().includes('.webp') ? 'webp' : 'jpg';
    const fname = `auto-${String(n).padStart(2, '0')}.${ext}`;
    const rel = `images/gallery/auto/${fname}`;
    const dest = path.join(ROOT, rel);
    await downloadFile(job.url, dest);
    images.push({
      src: rel.replace(/\\/g, '/'),
      alt: altFromCaption(job.caption),
      href: job.permalink || '',
    });
  }

  const out = {
    images,
    syncedAt: new Date().toISOString(),
    source: 'instagram-graph-api',
  };

  const dataDir = path.join(ROOT, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'gallery.json'), JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`OK: ${images.length} bilder → data/gallery.json og images/gallery/auto/`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
