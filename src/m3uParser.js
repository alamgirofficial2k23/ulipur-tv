/**
 * Parse M3U / M3U8 playlist text into array of channel objects
 */
export function parseM3U(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const channels = [];

  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXTINF:')) {
      current = {
        id: Math.random().toString(36).slice(2),
        name: '',
        logo: '',
        group: 'Uncategorized',
        url: '',
      };

      // Extract duration and attributes
      // Format: #EXTINF:-1 tvg-id="..." tvg-name="..." tvg-logo="..." group-title="...",Channel Name
      const commaIdx = line.indexOf(',');
      if (commaIdx !== -1) {
        current.name = line.slice(commaIdx + 1).trim();
        const attrPart = line.slice(8, commaIdx);

        const logoMatch = attrPart.match(/tvg-logo="([^"]*)"/);
        if (logoMatch) current.logo = logoMatch[1];

        const groupMatch = attrPart.match(/group-title="([^"]*)"/);
        if (groupMatch) current.group = groupMatch[1] || 'Uncategorized';

        const nameMatch = attrPart.match(/tvg-name="([^"]*)"/);
        if (nameMatch && !current.name) current.name = nameMatch[1];
      }
    } else if (line.startsWith('#')) {
      // Skip other M3U directives
      continue;
    } else if (current && (line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('rtsp'))) {
      current.url = line;
      if (current.name) {
        channels.push(current);
      }
      current = null;
    }
  }

  return channels;
}

/**
 * Group channels by their group-title
 */
export function groupChannels(channels) {
  const groups = {};
  for (const ch of channels) {
    const g = ch.group || 'Uncategorized';
    if (!groups[g]) groups[g] = [];
    groups[g].push(ch);
  }
  return groups;
}

/**
 * Fetch M3U from URL with CORS proxy fallback
 */
export async function fetchM3U(url) {
  // Try direct first
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const text = await res.text();
      if (text.includes('#EXTM3U') || text.includes('#EXTINF')) return text;
    }
  } catch (_) {}

  // Try CORS proxy
  const proxies = [
    `https://corsproxy.io/?${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  ];

  for (const proxy of proxies) {
    try {
      const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const text = await res.text();
        if (text.includes('#EXTINF') || text.length > 100) return text;
      }
    } catch (_) {}
  }

  throw new Error('Failed to fetch playlist. Try uploading the file directly.');
}
