/**
 * Instagram-lenke i bunntekst + valgfri reserve-galleri.
 *
 * Galleri: data/gallery.json (manuelt eller automatisk via GitHub Actions —
 * se scripts/INSTAGRAM-OPPSLAG.txt og .github/workflows/sync-instagram-gallery.yml).
 * Valgfritt: galleryImages brukes bare hvis gallery.json ikke kan lastes lokalt.
 */
window.SITE_CONFIG = {
  instagramUrl: 'https://www.instagram.com/flokroll/',
  facebookUrl: 'https://www.facebook.com/simonoglucien/',
  galleryImages: [],
};
