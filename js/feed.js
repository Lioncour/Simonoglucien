(function () {
  var cfg = window.SITE_CONFIG || {};
  var mount = document.getElementById('instagram-mount');
  if (!mount) return;

  function renderGallery(images) {
    mount.classList.add('feed-gallery-mount');
    var ul = document.createElement('ul');
    ul.className = 'gallery-grid';
    for (var i = 0; i < images.length; i++) {
      var item = images[i];
      if (!item || !item.src) continue;
      var li = document.createElement('li');
      li.className = 'gallery-item';
      var wrap;
      if (item.href) {
        wrap = document.createElement('a');
        wrap.href = item.href;
        wrap.target = '_blank';
        wrap.rel = 'noopener noreferrer';
      } else {
        wrap = document.createElement('div');
        wrap.className = 'gallery-item__frame';
      }
      var img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.loading = 'lazy';
      img.decoding = 'async';
      wrap.appendChild(img);
      li.appendChild(wrap);
      ul.appendChild(li);
    }
    mount.appendChild(ul);
  }

  function showPlaceholder() {
    mount.classList.add('feed-placeholder', 'prose-nb');
    var ig = cfg.instagramUrl || 'https://www.instagram.com/flokroll/';
    mount.innerHTML =
      '<p class="feed-placeholder__text">Legg bilder i <code>images/gallery/</code> og oppfør dem i <code>data/gallery.json</code> (<code>src</code>, <code>alt</code>, valgfri <code>href</code> til innlegg). Bruk en lokal server (f.eks. <code>python -m http.server</code>) så nettleseren kan laste JSON-filen.</p>' +
      '<p class="feed-placeholder__link"><a href="' +
      ig +
      '" target="_blank" rel="noopener noreferrer">Åpne Instagram</a></p>';
  }

  function normalizeImages(data) {
    if (!data || !data.images || !data.images.length) return [];
    return data.images.filter(function (item) {
      return item && typeof item.src === 'string' && item.src.length > 0;
    });
  }

  fetch('data/gallery.json', { credentials: 'same-origin' })
    .then(function (r) {
      if (!r.ok) throw new Error('gallery.json not ok');
      return r.json();
    })
    .then(function (data) {
      var images = normalizeImages(data);
      if (!images.length) throw new Error('no images');
      renderGallery(images);
    })
    .catch(function () {
      var fallback = (cfg.galleryImages || []).filter(function (item) {
        return item && item.src;
      });
      if (fallback.length) {
        renderGallery(fallback);
        return;
      }
      showPlaceholder();
    });
})();
