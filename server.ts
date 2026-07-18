import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { createServer as createViteServer } from 'vite';
import { getOrFetch } from './server/cache.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Compress all responses using Gzip/Brotli to minimize origin payload sizes
  app.use(compression());

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Recursive helper to rewrite any image URLs in API responses to our Cloudflare-cached proxy
  function rewriteImageUrls(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      // Check if it's an image URL that should be proxied
      const isExternalImage = 
        (obj.startsWith('http://') || obj.startsWith('https://')) &&
        (obj.includes('unsplash.com') ||
         obj.includes('anilist.co') ||
         obj.includes('img.kryzox.xyz') ||
         obj.match(/\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i));

      if (isExternalImage && !obj.includes('/api/image-proxy')) {
        return `/api/image-proxy?url=${encodeURIComponent(obj)}`;
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => rewriteImageUrls(item));
    }

    if (typeof obj === 'object') {
      const newObj: any = {};
      for (const key of Object.keys(obj)) {
        newObj[key] = rewriteImageUrls(obj[key]);
      }
      return newObj;
    }

    return obj;
  }

  // API proxy route for images to enable long-lived Cloudflare CDN Edge & Browser caching
  app.get('/api/image-proxy', async (req, res) => {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('Missing url parameter');
    }

    try {
      // Fetch image from origin
      const imageRes = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        }
      });

      if (!imageRes.ok) {
        throw new Error(`External server responded with status ${imageRes.status}`);
      }

      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await imageRes.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      // Set long-lived cache headers for browser & Cloudflare Edge CDN (1 Year = 31536000s)
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=31536000');
      res.setHeader('CDN-Cache-Control', 'max-age=31536000');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Alt-Svc', 'h3=":443"; ma=86400');

      return res.send(imageBuffer);
    } catch (err: any) {
      // Quietly redirect to high-quality fallback image on failure without noisy error logs
      const fallbackUrl = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300&auto=format&fit=crop&q=80';
      return res.redirect(fallbackUrl);
    }
  });

  // Resilient, rate-limit aware fetch function for Kryzox API with retries and exponential backoff
  async function fetchKryzoxWithRetry(url: string, retries = 3, delayMs = 1000): Promise<any> {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://api.kryzox.xyz/'
    };

    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url, { headers });
        if (res.status === 429) {
          if (i < retries - 1) {
            console.warn(`[Kryzox Proxy Retry] URL ${url} returned 429. Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs *= 2.5; // Exponential backoff with a larger multiplier for rate limits
            continue;
          }
          const err = new Error(`Kryzox API responded with status 429 (Too Many Requests)`);
          (err as any).status = 429;
          throw err;
        }

        if (!res.ok) {
          const err = new Error(`Kryzox API responded with status ${res.status}`);
          (err as any).status = res.status;
          throw err;
        }

        return await res.json();
      } catch (err: any) {
        if (i === retries - 1 || err.status === 429) {
          throw err;
        }
        console.warn(`[Kryzox Proxy Retry] Error fetching ${url}: ${err.message}. Retrying in ${delayMs}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2;
      }
    }
  }

  // API proxy route for Kryzox API with advanced stale-while-revalidate caching
  app.get('/api/kryzox/*', async (req, res) => {
    try {
      const endpointPath = req.originalUrl.replace(/^\/api\/kryzox/, '');
      if (!endpointPath || endpointPath === '/') {
        return res.status(400).json({ error: 'Missing target endpoint' });
      }

      // Safeguard: Custom anime IDs do not exist on the external Kryzox API
      if (endpointPath.includes('custom-')) {
        if (endpointPath.includes('/episodes')) {
          return res.json({ success: true, data: [] });
        }
        return res.status(404).json({ success: false, error: 'Custom anime metadata not found on Kryzox API' });
      }

      const targetUrl = `https://api.kryzox.xyz${endpointPath}`;
      const cacheKey = `kryzox:${endpointPath}`;

      // Configurable Redis TTL of 24 hours (86400 seconds)
      const ttlSeconds = 24 * 60 * 60;
      // Stale threshold of 1 hour for normal metadata
      const staleThresholdMs = 1 * 60 * 60 * 1000;

      const data = await getOrFetch(
        cacheKey,
        async () => {
          return await fetchKryzoxWithRetry(targetUrl);
        },
        ttlSeconds,
        staleThresholdMs
      );

      // Enable robust Cloudflare Edge Caching
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=86400');
      res.setHeader('CDN-Cache-Control', 'max-age=86400');
      res.setHeader('Alt-Svc', 'h3=":443"; ma=86400');

      return res.json(rewriteImageUrls(data));
    } catch (err: any) {
      const statusCode = err.status || 500;
      if (statusCode === 404) {
        console.warn(`[Kryzox Proxy Info] ${req.originalUrl}: Not found (404)`);
      } else {
        console.error(`[Kryzox Proxy Error] ${req.originalUrl}:`, err.message);
      }
      return res.status(statusCode).json({ error: err.message || 'Kryzox Proxy error' });
    }
  });

  // API proxy route for AnOvA backup Replit API with advanced stale-while-revalidate caching
  app.get('/api/anova/*', async (req, res) => {
    try {
      const endpointPath = req.originalUrl.replace(/^\/api\/anova/, '');
      if (!endpointPath || endpointPath === '/') {
        return res.status(400).json({ error: 'Missing target endpoint' });
      }

      const targetUrl = `https://backup--idplaypoinbdb.replit.app${endpointPath}`;
      const cacheKey = `anova_backup:${endpointPath}`;

      // Configurable Redis TTL of 24 hours (86400 seconds)
      const ttlSeconds = 24 * 60 * 60;
      // Stale threshold of 1 hour for normal metadata
      const staleThresholdMs = 1 * 60 * 60 * 1000;

      const data = await getOrFetch(
        cacheKey,
        async () => {
          const apiRes = await fetch(targetUrl);
          if (!apiRes.ok) {
            const err = new Error(`AnOvA backup API responded with status ${apiRes.status}`);
            (err as any).status = apiRes.status;
            throw err;
          }
          return await apiRes.json();
        },
        ttlSeconds,
        staleThresholdMs
      );

      // Enable robust Cloudflare Edge Caching
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=86400');
      res.setHeader('CDN-Cache-Control', 'max-age=86400');
      res.setHeader('Alt-Svc', 'h3=":443"; ma=86400');

      return res.json(rewriteImageUrls(data));
    } catch (err: any) {
      const statusCode = err.status || 500;
      if (statusCode === 404) {
        console.warn(`[AnOvA Proxy Info] ${req.originalUrl}: Not found (404)`);
      } else {
        console.error(`[AnOvA Proxy Error] ${req.originalUrl}:`, err.message);
      }
      return res.status(statusCode).json({ error: err.message || 'AnOvA Proxy error' });
    }
  });

  // API Route to dynamically resolve AnOvA streams server-side to bypass CORS and DNS blockades with cache
  app.get('/api/resolve-anova-stream', async (req, res) => {
    try {
      const { id, season = '1', ep, isMovie, lang } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Missing required parameter: id' });
      }

      const cacheKey = `anova_stream:${id}:S${season}:E${ep}:movie=${isMovie}:lang=${lang || ''}`;
      const ttlSeconds = 24 * 60 * 60; // 24 Hours Redis TTL
      const staleThresholdMs = 4 * 60 * 60 * 1000; // 4 Hours Stale threshold for media links

      const result = await getOrFetch(
        cacheKey,
        async () => {
          let streamApiUrl = '';
          if (isMovie === 'true' || !ep) {
            streamApiUrl = `https://backup--idplaypoinbdb.replit.app/api/movie?id=${encodeURIComponent(id as string)}`;
          } else {
            streamApiUrl = `https://backup--idplaypoinbdb.replit.app/api/stream?id=${encodeURIComponent(id as string)}&season=${season}&ep=${ep}`;
          }

          console.log(`[Resolver] Fetching stream info from AnOvA: ${streamApiUrl}`);
          const apiRes = await fetch(streamApiUrl);
          if (!apiRes.ok) {
            if (apiRes.status === 404) {
              console.warn(`[Resolver] Stream not found (404) for id ${id} from AnOvA API`);
              const err = new Error('Stream not found from AnOvA source');
              (err as any).status = 404;
              throw err;
            }
            const err = new Error(`AnOvA API responded with status ${apiRes.status}`);
            (err as any).status = apiRes.status;
            throw err;
          }

          const apiData = (await apiRes.json()) as any;
          const results = apiData.results || [];
          
          const validOptions = results.filter((r: any) => r && r.link);
          if (validOptions.length === 0) {
            const err = new Error('No valid options found in AnOvA API response');
            (err as any).status = 404;
            throw err;
          }

          let serverOption = null;

          // 1. Try language match if requested
          if (lang) {
            const langStr = String(lang).toLowerCase();
            serverOption = validOptions.find((r: any) => 
              r.language && r.language.toLowerCase() === langStr
            );
          }

          // 2. Fallback to server type options
          if (!serverOption) {
            serverOption = validOptions.find((r: any) => r.type === 'server') ||
                           validOptions.find((r: any) => r.type === 'stream') ||
                           validOptions[0];
          }

          const embedUrl = serverOption.link;
          console.log(`[Resolver] Selected option with link: ${embedUrl}`);

          let playableUrl = null;
          let videoData: any = {};

          try {
            // Attempt standard getVideo POST resolution if it looks like a standard stream domain
            if (embedUrl.includes('/video/') || embedUrl.includes('/player/index.php')) {
              const urlObj = new URL(embedUrl);
              const domain = urlObj.hostname;
              const videoId = urlObj.pathname.split('/').pop();

              if (videoId) {
                const postUrl = `https://${domain}/player/index.php?data=${videoId}&do=getVideo`;
                console.log(`[Resolver] Attempting getVideo POST: ${postUrl}`);

                const postBody = new URLSearchParams();
                postBody.append('hash', videoId);
                postBody.append('r', `https://${domain}/`);

                const videoRes = await fetch(postUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': `https://${domain}/video/${videoId}`
                  },
                  body: postBody.toString()
                });

                if (videoRes.ok) {
                  const videoText = await videoRes.text();
                  try {
                    videoData = JSON.parse(videoText);
                    playableUrl = videoData.securedLink || videoData.videoSource;
                  } catch (e) {
                    console.warn(`[Resolver] Failed to parse player server response as JSON, falling back to original embed`);
                  }
                }
              }
            }
          } catch (e: any) {
            console.warn(`[Resolver] Error during getVideo extraction, falling back to original embed link:`, e.message);
          }

          // Smart Fallback: if scraping direct source failed or was skipped, use the embed URL itself!
          if (!playableUrl) {
            console.log(`[Resolver] Direct source resolution skipped/failed. Falling back to original embed link: ${embedUrl}`);
            playableUrl = embedUrl;
          }

          console.log(`[Resolver] Resolved direct stream URL: ${playableUrl}`);
          return {
            success: true,
            url: playableUrl,
            image: videoData.videoImage || '',
            originalEmbed: embedUrl
          };
        },
        ttlSeconds,
        staleThresholdMs
      );

      // Enable robust Cloudflare Edge Caching
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=86400');
      res.setHeader('CDN-Cache-Control', 'max-age=86400');
      res.setHeader('Alt-Svc', 'h3=":443"; ma=86400');

      return res.json(rewriteImageUrls(result));
    } catch (err: any) {
      const statusCode = err.status || 500;
      if (statusCode === 404) {
        console.warn('[Resolver Info] Stream not found (404) in resolve-anova-stream:', err.message);
      } else {
        console.error('[Resolver Error] Error in resolve-anova-stream:', err);
      }
      return res.status(statusCode).json({
        success: false,
        error: err.message || 'Unknown stream resolution error'
      });
    }
  });

  // API route for Anime ID mapping resolution (Redis -> Firebase -> API fallback)
  app.get('/api/anime-mapping/:id', async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Missing anime id' });
    }

    // Bypass external mapping lookup for custom-created anime IDs
    if (id.startsWith('custom-')) {
      return res.json({
        id,
        animoId: id,
        anilistId: '',
        malId: '',
        success: true
      });
    }

    try {
      const cacheKey = `anime-mapping:${id}`;
      // Map to 1 year TTL
      const ttlSeconds = 365 * 24 * 60 * 60;
      // Stale threshold is 30 days
      const staleThresholdMs = 30 * 24 * 60 * 60 * 1000;

      const mapping = await getOrFetch(
        cacheKey,
        async () => {
          // Fetch from Kryzox API /anime/:id to get mapping
          const targetUrl = `https://api.kryzox.xyz/anime/${id}`;
          console.log(`[Mapping Resolver] Fetching fresh mapping details for ID ${id} from: ${targetUrl}`);
          
          let animoId = id;
          let anilistId = '';
          let malId = '';

          try {
            const data = await fetchKryzoxWithRetry(targetUrl, 2, 800);
            const animeObj = data.data || data;
            if (animeObj) {
              animoId = String(animeObj.id || id);
              anilistId = String(animeObj.al_id || animeObj.anilist_id || animeObj.anilistId || animeObj.alId || '');
              malId = String(animeObj.mal_id || animeObj.malId || '');
            }
          } catch (apiErr: any) {
            console.error(`[Mapping Resolver] Kryzox API fetch failed for ID ${id}:`, apiErr.message);
          }

          // If mapping is still missing, scan episodes
          if (!anilistId || !malId || anilistId === 'null' || malId === 'null') {
            const episodesUrl = `https://api.kryzox.xyz/anime/${id}/episodes`;
            try {
              const epData = await fetchKryzoxWithRetry(episodesUrl, 2, 800);
              let epsList = [];
              if (Array.isArray(epData)) epsList = epData;
              else if (Array.isArray(epData?.data)) epsList = epData.data;
              else if (Array.isArray(epData?.episodes)) epsList = epData.episodes;

              for (const ep of epsList) {
                if (ep) {
                  const epAni = ep.ani || ep.anilistId || ep.anilist_id || ep.al_id || ep.alId;
                  const epMal = ep.mal || ep.malId || ep.mal_id;
                  if (!anilistId && epAni) {
                    const str = String(epAni);
                    anilistId = str.includes('/') ? str.split('/')[0] : str;
                  }
                  if (!malId && epMal) {
                    const str = String(epMal);
                    malId = str.includes('/') ? str.split('/')[0] : str;
                  }
                }
                if (anilistId && malId) break;
              }
            } catch (err: any) {
              console.warn(`[Mapping Resolver] Failed to fetch episodes for scanning:`, err.message);
            }
          }

          // Filter out invalid placeholders
          if (anilistId === 'null' || anilistId === 'undefined' || anilistId === '0') {
            anilistId = '';
          }
          if (malId === 'null' || malId === 'undefined' || malId === '0') {
            malId = '';
          }

          // If still missing and id is numeric, fallback to it
          const isNumeric = /^\d+$/.test(id);
          if (isNumeric) {
            if (!anilistId) {
              anilistId = id;
            }
            if (!malId) {
              malId = id;
            }
          }

          return { animoId, anilistId, malId };
        },
        ttlSeconds,
        staleThresholdMs
      );

      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.json(mapping);
    } catch (err: any) {
      console.error(`[Mapping Resolver Error] Failed to resolve mapping for ${id}:`, err);
      return res.status(500).json({ error: err.message || 'Mapping resolution failed' });
    }
  });

  // Server-side verification endpoint to get real status codes without CORS restrictions
  app.get('/api/verify-url', async (req, res) => {
    const urlStr = req.query.url as string;
    if (!urlStr) {
      return res.status(400).json({ error: 'Missing url' });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout
      
      let response = null;
      try {
        response = await fetch(urlStr, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://cdn.4animo.xyz/',
            'Accept': '*/*'
          },
          signal: controller.signal
        });
      } catch (headErr) {
        response = null;
      }
      clearTimeout(timeoutId);

      // If HEAD failed or is not allowed/blocked (status is not 2xx), fall back to GET with a short timeout and a Range/Abort limit
      if (!response || !response.ok || response.status === 405 || response.status === 403) {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 3500);
        try {
          const getResponse = await fetch(urlStr, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Referer': 'https://cdn.4animo.xyz/',
              'Range': 'bytes=0-1024',
              'Accept': '*/*'
            },
            signal: getController.signal
          });
          clearTimeout(getTimeoutId);
          response = getResponse;
        } catch (_) {
          clearTimeout(getTimeoutId);
        }
      }

      const finalStatus = response ? response.status : 0;
      // Consider successful if 2xx, or 416 (Range Satisfied), or 403 (Exists but direct curl forbidden, which is normal for CDNs and completely playable inside the browser iframe!)
      const success = response ? (response.ok || response.status === 416 || response.status === 403 || response.status === 302) : false;

      return res.json({
        success,
        status: finalStatus
      });
    } catch (err: any) {
      console.warn(`[Verify URL Error] Failed to verify ${urlStr}:`, err.message);
      return res.json({
        success: false,
        error: err.message
      });
    }
  });

  // Fetch YouTube Playlist items securely (with Scraper & Multi-Instance Invidious Proxy Fallback)
  app.get('/api/youtube-playlist', async (req, res) => {
    const { playlistUrl } = req.query;
    if (!playlistUrl || typeof playlistUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing playlistUrl parameter' });
    }

    // Extract playlist ID from URL or use as-is
    let playlistId = playlistUrl.trim();
    if (playlistUrl.includes('list=')) {
      const match = playlistUrl.match(/[&?]list=([^&]+)/);
      if (match && match[1]) {
        playlistId = match[1];
      }
    }

    // Helper to scrape public YouTube playlist page (Last-Resort Fallback)
    const fetchPlaylistPage = async (pid: string): Promise<any[]> => {
      const url = `https://www.youtube.com/playlist?list=${pid}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube returned status ${response.status} when scraping playlist.`);
      }

      const html = await response.text();

      // Extract ytInitialData object
      let jsonStr = '';
      const regexes = [
        /ytInitialData\s*=\s*({[\s\S]+?});\s*(?:<\/script>|window|var)/,
        /ytInitialData\s*=\s*({[\s\S]+?});/,
        /var ytInitialData\s*=\s*([\s\S]+?);<\/script>/,
        /window\["ytInitialData"\]\s*=\s*([\s\S]+?);/
      ];

      for (const regex of regexes) {
        const match = html.match(regex);
        if (match && match[1]) {
          jsonStr = match[1].trim();
          break;
        }
      }

      if (!jsonStr) {
        throw new Error('Could not find playlist data (ytInitialData) in YouTube response. Make sure the playlist is public.');
      }

      let data: any;
      try {
        data = JSON.parse(jsonStr);
      } catch (err) {
        throw new Error('Failed to parse YouTube playlist data.');
      }

      // Find all playlistVideoRenderer instances recursively
      const renderers: any[] = [];
      const recurse = (current: any) => {
        if (!current || typeof current !== 'object') return;
        if (current.playlistVideoRenderer) {
          renderers.push(current.playlistVideoRenderer);
          return;
        }
        if (Array.isArray(current)) {
          for (const item of current) {
            recurse(item);
          }
        } else {
          for (const key of Object.keys(current)) {
            recurse(current[key]);
          }
        }
      };

      recurse(data);

      if (renderers.length === 0) {
        throw new Error('No videos found in YouTube playlist. Make sure the playlist is public and contains videos.');
      }

      // Map renderers to our unified structure
      return renderers.map((video: any) => {
        const videoId = video.videoId || '';
        
        // Extract title safely
        let title = '';
        if (video.title) {
          if (video.title.runs && video.title.runs[0]) {
            title = video.title.runs[0].text || '';
          } else if (video.title.simpleText) {
            title = video.title.simpleText || '';
          }
        }

        // Extract thumbnail safely (select highest quality)
        let thumbnail = '';
        const thumbs = video.thumbnail?.thumbnails || [];
        if (thumbs.length > 0) {
          const highest = thumbs.reduce((prev: any, curr: any) => {
            return (prev.width || 0) > (curr.width || 0) ? prev : curr;
          });
          thumbnail = highest.url || '';
        }

        const lowerTitle = title.toLowerCase();
        const isPrivateOrDeleted = 
          video.isPlayable === false || 
          lowerTitle.includes('deleted video') || 
          lowerTitle.includes('private video');

        return {
          videoId,
          title,
          thumbnail,
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
          isPrivateOrDeleted
        };
      });
    };

    // Helper to fetch playlist items from public Invidious instances to bypass Google IP rate limiting
    const fetchPlaylistViaInvidious = async (pid: string): Promise<any[]> => {
      let activeDomains: string[] = [];

      try {
        console.log('[YouTube Playlist] Fetching dynamic list of Invidious instances...');
        const res = await fetch('https://api.invidious.io/instances.json', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const instances = await res.json();
          if (Array.isArray(instances)) {
            activeDomains = instances
              .filter(([domain, details]) => details.type === 'https' && details.monitor && details.monitor.down === false)
              .map(([domain]) => domain);
          }
        }
      } catch (err: any) {
        console.warn('[YouTube Playlist] Failed to fetch dynamic Invidious list, falling back to hardcoded list:', err.message);
      }

      // Fallback hardcoded list of stable active Invidious instances
      const fallbackDomains = [
        'inv.nadeko.net',
        'invidious.nerdvpn.de',
        'invidious.privacydev.net',
        'inv.git.fm',
        'invidious.lunar.icu',
        'invidio.xamh.de',
        'yt.artemislena.eu',
        'invidious.projectsegfaut.im'
      ];

      // Merge dynamic and fallback domains, preserving unique values
      const domainsToTry = Array.from(new Set([...activeDomains, ...fallbackDomains])).slice(0, 8);

      for (const domain of domainsToTry) {
        const url = `https://${domain}/api/v1/playlists/${pid}`;
        console.log(`[YouTube Playlist] Trying Invidious proxy instance: ${domain}...`);
        try {
          const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
          if (response.ok) {
            const data = await response.json();
            if (data.videos && Array.isArray(data.videos)) {
              console.log(`[YouTube Playlist] Successfully retrieved playlist from ${domain}!`);
              return data.videos.map((video: any) => {
                const videoId = video.videoId || '';
                const title = video.title || '';
                const thumbs = video.videoThumbnails || [];
                
                let thumbnail = '';
                if (thumbs.length > 0) {
                  const highest = thumbs.reduce((prev: any, curr: any) => {
                    return (prev.width || 0) > (curr.width || 0) ? prev : curr;
                  });
                  thumbnail = highest.url || thumbs[0].url || '';
                } else {
                  thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }

                return {
                  videoId,
                  title,
                  thumbnail,
                  url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
                  isPrivateOrDeleted: false
                };
              });
            }
          } else {
            console.warn(`[YouTube Playlist] Instance ${domain} returned status ${response.status}`);
          }
        } catch (err: any) {
          console.warn(`[YouTube Playlist] Instance ${domain} failed or timed out:`, err.message);
        }
      }

      throw new Error('All Invidious proxy instances failed or returned invalid data.');
    };

    const apiKey = process.env.YOUTUBE_API_KEY;
    const isApiKeyConfigured = apiKey && apiKey !== 'YOUR_YOUTUBE_API_KEY' && !apiKey.startsWith('YOUR_');

    if (isApiKeyConfigured) {
      try {
        console.log('[YouTube Playlist] Attempting fetch via official API with configured key...');
        let items: any[] = [];
        let nextPageToken = '';
        let pagesFetched = 0;
        const maxPages = 15; // Fetch up to 750 videos

        do {
          const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,status&playlistId=${playlistId}&maxResults=50&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `YouTube API responded with status ${response.status}`;
            throw new Error(errMsg);
          }

          const data = await response.json();
          if (data.items) {
            items = items.concat(data.items);
          }
          nextPageToken = data.nextPageToken || '';
          pagesFetched++;
        } while (nextPageToken && pagesFetched < maxPages);

        // Process and filter items
        const processedItems = items.map((item: any) => {
          const snippet = item.snippet || {};
          const status = item.status || {};
          const title = snippet.title || '';
          const videoId = snippet.resourceId?.videoId || '';
          const isPrivateOrDeleted = 
            status.privacyStatus === 'private' || 
            title.toLowerCase() === 'deleted video' || 
            title.toLowerCase() === 'private video';

          // Select the highest available quality thumbnail
          const thumbs = snippet.thumbnails || {};
          const thumbnail = 
            thumbs.maxres?.url || 
            thumbs.standard?.url || 
            thumbs.high?.url || 
            thumbs.medium?.url || 
            thumbs.default?.url || 
            '';

          return {
            videoId,
            title,
            thumbnail,
            url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : '',
            isPrivateOrDeleted
          };
        });

        return res.json({
          success: true,
          playlistId,
          items: processedItems,
          source: 'api'
        });
      } catch (apiError: any) {
        console.warn('[YouTube Playlist] Official API failed, falling back to Invidious proxies:', apiError.message);
      }
    }

    // Try Invidious proxy instances first (to bypass Google Cloud Run CAPTCHA on standard YouTube)
    try {
      const processedItems = await fetchPlaylistViaInvidious(playlistId);
      return res.json({
        success: true,
        playlistId,
        items: processedItems,
        source: 'invidious_proxy'
      });
    } catch (invidiousError: any) {
      console.warn('[YouTube Playlist] Invidious proxy sequence failed, trying public scraper as last resort:', invidiousError.message);
    }

    // Last-resort fallback to public page scraper
    try {
      console.log('[YouTube Playlist] Fetching playlist via public scraper (last-resort)...');
      const processedItems = await fetchPlaylistPage(playlistId);
      return res.json({
        success: true,
        playlistId,
        items: processedItems,
        source: 'scraper'
      });
    } catch (scrapeError: any) {
      console.error('[YouTube Playlist Error] All fetch methods failed. Scraper failed with:', scrapeError.message);
      return res.status(500).json({
        success: false,
        error: scrapeError.message || 'Failed to fetch YouTube playlist via all available methods.'
      });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    // Pre-parse the production index.html to collect script and style resources for Early Hints
    const earlyHintsLinks: string[] = [];
    try {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf-8');
        
        // Collect stylesheets
        const cssMatches = html.matchAll(/href="([^"]+\.css)"/g);
        for (const m of cssMatches) {
          earlyHintsLinks.push(`<${m[1]}>; rel=preload; as=style`);
        }

        // Collect scripts
        const jsMatches = html.matchAll(/src="([^"]+\.js)"/g);
        for (const m of jsMatches) {
          earlyHintsLinks.push(`<${m[1]}>; rel=preload; as=script`);
        }
        
        console.log(`[Early Hints Engine] Preloaded assets:`, earlyHintsLinks);
      }
    } catch (err: any) {
      console.warn('[Early Hints Engine] Could not parse index.html:', err.message);
    }

    // Serve static files with 1 year cache headers and Cloudflare integration
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
        res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=31536000');
        res.setHeader('CDN-Cache-Control', 'max-age=31536000');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Alt-Svc', 'h3=":443"; ma=86400');
      }
    }));

    app.get('*', (req, res) => {
      // Send Early Hints / Link headers for lightning-fast Edge preloading
      if (earlyHintsLinks.length > 0) {
        res.setHeader('Link', earlyHintsLinks.join(', '));
      }
      
      // Let Cloudflare cache the index.html with stale-while-revalidate
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
      res.setHeader('Cloudflare-CDN-Cache-Control', 'max-age=3600');
      res.setHeader('Alt-Svc', 'h3=":443"; ma=86400');

      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Full-Stack Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
