const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  siteTitle: 'RetroChroniques',
  siteUrl: 'https://votre-domaine.com', // À modifier avec votre domaine réel
  siteDescription: 'Chroniques personnelles de jeux vidéo rétro : GBA, Megadrive, SNES, PS1, Amiga et plus encore.',
  author: 'Nico',
  rssFile: '../feed/rss.xml',
  reviewsDir: 'reviews',
  maxItems: 50 // Nombre maximum d'articles dans le flux
};

// Fonction pour échapper le XML
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Fonction pour formater la date RFC 822
function formatDate(date) {
  return date.toUTCString();
}

// Fonction pour extraire les données d'un fichier de chronique
function extractReviewData(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Extraction simple des données via regex
  const titleMatch = content.match(/title:\s*"([^"]+)"/);
  const idMatch = content.match(/id:\s*(\d+)/);
  const ratingMatch = content.match(/rating:\s*(\d+)/);
  const yearMatch = content.match(/year:\s*(\d+)/);
  const platformsMatch = content.match(/platforms:\s*\[([^\]]+)\]/);
  const categoryMatch = content.match(/category:\s*"([^"]+)"/);
  
  // Extraction des paragraphes de review
  const reviewMatch = content.match(/review:\s*\[([\s\S]*?)\]/);
  let reviewText = '';
  if (reviewMatch) {
    const paragraphs = reviewMatch[1]
      .split('"')
      .filter(s => s.trim() && !s.startsWith(','))
      .map(s => s.trim());
    reviewText = paragraphs;
  }
  
  // Extraction des images
  const imagesMatch = content.match(/images:\s*\[([\s\S]*?)\]/);
  let images = [];
  if (imagesMatch) {
    const imageEntries = imagesMatch[1].match(/\{\s*src:\s*"([^"]+)"\s*,\s*alt:\s*"([^"]+)"\s*\}/g);
    if (imageEntries) {
      images = imageEntries.map(entry => {
        const srcMatch = entry.match(/src:\s*"([^"]+)"/);
        const altMatch = entry.match(/alt:\s*"([^"]+)"/);
        return {
          src: srcMatch ? srcMatch[1] : '',
          alt: altMatch ? altMatch[1] : ''
        };
      });
    }
  }
  
  // Extraction des liens (vidéos YouTube)
  const linksMatch = content.match(/links:\s*\[([\s\S]*?)\]/);
  let links = [];
  if (linksMatch) {
    const linkEntries = linksMatch[1].match(/\{\s*url:\s*"([^"]+)"\s*,\s*type:\s*"([^"]+)"\s*,\s*label:\s*"([^"]+)"\s*\}/g);
    if (linkEntries) {
      links = linkEntries.map(entry => {
        const urlMatch = entry.match(/url:\s*"([^"]+)"/);
        const typeMatch = entry.match(/type:\s*"([^"]+)"/);
        const labelMatch = entry.match(/label:\s*"([^"]+)"/);
        return {
          url: urlMatch ? urlMatch[1] : '',
          type: typeMatch ? typeMatch[1] : '',
          label: labelMatch ? labelMatch[1] : ''
        };
      });
    }
  }
  
  return {
    id: idMatch ? parseInt(idMatch[1]) : 0,
    title: titleMatch ? titleMatch[1] : 'Sans titre',
    rating: ratingMatch ? parseInt(ratingMatch[1]) : null,
    year: yearMatch ? parseInt(yearMatch[1]) : null,
    platforms: platformsMatch ? platformsMatch[1].split(',').map(p => p.trim().replace(/"/g, '')) : [],
    category: categoryMatch ? categoryMatch[1] : 'standard',
    review: reviewText,
    images: images,
    links: links
  };
}

// Fonction pour extraire l'ID YouTube depuis une URL
function extractYoutubeId(url) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Fonction principale
function generateRSS() {
  console.log('Génération du flux RSS...');
  
  // Lire tous les fichiers de chroniques
  const reviewsDir = path.join(__dirname, config.reviewsDir);
  const files = fs.readdirSync(reviewsDir)
    .filter(f => f.endsWith('.js'))
    .sort(); // Tri par nom de fichier (ordre chronologique)
  
  // Extraire les données
  let reviews = files.map(file => {
    const filePath = path.join(reviewsDir, file);
    return extractReviewData(filePath);
  });
  
  // Trier par ID décroissant (plus récents en premier)
  reviews.sort((a, b) => b.id - a.id);
  
  // Limiter le nombre d'articles
  reviews = reviews.slice(0, config.maxItems);
  
  // Date de mise à jour (date actuelle)
  const lastBuildDate = formatDate(new Date());
  
  // Générer le XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  xml += '  <channel>\n';
  xml += '    <title>' + escapeXml(config.siteTitle) + '</title>\n';
  xml += '    <link>' + escapeXml(config.siteUrl) + '</link>\n';
  xml += '    <description>' + escapeXml(config.siteDescription) + '</description>\n';
  xml += '    <language>fr-fr</language>\n';
  xml += '    <lastBuildDate>' + lastBuildDate + '</lastBuildDate>\n';
  xml += '    <atom:link href="' + escapeXml(config.siteUrl) + '/feed/rss.xml" rel="self" type="application/rss+xml"/>\n';
  xml += '    <managingEditor>' + escapeXml(config.author) + '</managingEditor>\n';
  
  // Ajouter chaque chronique
  reviews.forEach(review => {
    // URL de la chronique (avec hash pour deep linking)
    const link = config.siteUrl + '/#review-' + review.id;
    
    // Date de publication (basée sur l'année ou date actuelle)
    const pubDate = review.year 
      ? formatDate(new Date(review.year, 0, 1))
      : formatDate(new Date());
    
    // Catégorie
    const category = review.category === 'fan-game' ? 'Fan Game' :
                    review.category === 'rom-hack' ? 'ROM Hack' : 'Jeu officiel';
    
    // Plateformes
    const platforms = review.platforms.join(', ');
    
    // Note
    const rating = review.rating ? '★'.repeat(review.rating) : 'N/N';
    
    xml += '    <item>\n';
    xml += '      <title>' + escapeXml(review.title) + '</title>\n';
    xml += '      <link>' + escapeXml(link) + '</link>\n';
    xml += '      <guid isPermaLink="false">' + review.id + '</guid>\n';
    xml += '      <pubDate>' + pubDate + '</pubDate>\n';
    xml += '      <category>' + escapeXml(category) + '</category>\n';
    xml += '      <description>\n';
    xml += '        <![CDATA[\n';
    
    // Métadonnées
    xml += '          <p><strong>Plateformes:</strong> ' + escapeXml(platforms) + '</p>\n';
    xml += '          <p><strong>Année:</strong> ' + (review.year || 'N/A') + '</p>\n';
    xml += '          <p><strong>Note:</strong> ' + escapeXml(rating) + '</p>\n';
    
    // Texte de la chronique (tous les paragraphes)
    if (Array.isArray(review.review)) {
      review.review.forEach(paragraph => {
        xml += '          <p>' + escapeXml(paragraph) + '</p>\n';
      });
    }
    
    // Images
    if (review.images && review.images.length > 0) {
      xml += '          <div class="images">\n';
      review.images.forEach(img => {
        const fullImgUrl = img.src.startsWith('http') ? img.src : config.siteUrl + '/' + img.src;
        xml += '            <img src="' + escapeXml(fullImgUrl) + '" alt="' + escapeXml(img.alt) + '" />\n';
      });
      xml += '          </div>\n';
    }
    
    // Vidéos YouTube
    if (review.links && review.links.length > 0) {
      const youtubeLinks = review.links.filter(l => l.type === 'youtube');
      youtubeLinks.forEach(link => {
        const videoId = extractYoutubeId(link.url);
        if (videoId) {
          xml += '          <div class="video">\n';
          xml += '            <iframe src="https://www.youtube-nocookie.com/embed/' + videoId + '" allowfullscreen></iframe>\n';
          xml += '          </div>\n';
        }
      });
    }
    
    xml += '          <p><a href="' + escapeXml(link) + '">Lire la chronique complète</a></p>\n';
    xml += '        ]]>\n';
    xml += '      </description>\n';
    xml += '    </item>\n';
  });
  
  xml += '  </channel>\n';
  xml += '</rss>\n';
  
  // Écrire le fichier
  const outputPath = path.join(__dirname, config.rssFile);
  fs.writeFileSync(outputPath, xml, 'utf-8');
  
  console.log('✓ Flux RSS généré: ' + outputPath);
  console.log('✓ ' + reviews.length + ' chroniques incluses');
}

// Exécuter
generateRSS();
