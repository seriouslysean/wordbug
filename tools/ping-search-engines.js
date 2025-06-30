#!/usr/bin/env node

/**
 * Search Engine Ping Service
 * 
 * This script pings search engines to notify them about sitemap updates.
 * Run this script after deploying new content to help search engines discover changes faster.
 * 
 * Usage: node ping-search-engines.js [--site-url URL] [--site-name NAME] [--deployed-hash HASH] [--dry-run] [--force]
 * 
 * Options:
 *   --site-url      The base URL of the deployed site (e.g. https://example.com)
 *   --site-name     The name of the site (for Ping-O-Matic)
 *   --deployed-hash The hash of the deployed content (for change detection)
 *   --dry-run       Don't actually ping services, just show what would be pinged
 *   --force         Ping regardless of content change detection
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

// Get the value for a CLI flag from an argument array
function getArgValue(flag, argsArr) {
  const idx = argsArr.findIndex(arg => arg === flag);
  if (idx !== -1 && argsArr[idx + 1] && !argsArr[idx + 1].startsWith('--')) {
    return argsArr[idx + 1];
  }
  return undefined;
}

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

const siteUrlArg = getArgValue('--site-url', args);
const siteNameArg = getArgValue('--site-name', args);
const deployedHashArg = getArgValue('--deployed-hash', args);

if (!siteUrlArg || !siteNameArg) {
  console.error('Error: Missing required arguments: --site-url and --site-name are required.');
  process.exit(1);
}

const siteUrl = siteUrlArg.endsWith('/') ? siteUrlArg.slice(0, -1) : siteUrlArg;
const sitemapUrl = `${siteUrl}/sitemap-index.xml`;

// List of search engine endpoints as objects with singular key and dynamic content in a nested object
const engineList = [
  {
    engine: {
      name: 'Google',
      url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
  },
  {
    engine: {
      name: 'Bing',
      url: `https://www.bing.com/webmaster/ping.aspx?sitemap=${encodeURIComponent(sitemapUrl)}`,
    },
  },
  {
    engine: {
      name: 'Ping-O-Matic',
      url: `http://rpc.pingomatic.com/ping/?title=${encodeURIComponent(siteNameArg)}&blogurl=${encodeURIComponent(siteUrl)}&rssurl=${encodeURIComponent(sitemapUrl)}&chk_weblogscom=on&chk_blogs=on&chk_feedburner=on&chk_newsgator=on&chk_newsburst=on&chk_feedster=on&chk_topicexchange=on&chk_google=on&chk_tailrank=on&chk_bloglines=on`,
    },
  },
];

// Ping a search engine
function pingSearchEngine(engineObj) {
  const engine = engineObj.engine;
  return new Promise((resolve, reject) => {
    console.log(`Pinging ${engine.name}...`);
    const url = new URL(engine.url);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          engine: engine.name,
          status: res.statusCode,
          data: data.slice(0, 100), // Truncate long responses
        });
      });
    });
    req.on('error', (error) => {
      reject({
        engine: engine.name,
        error: error.message,
      });
    });
    req.end();
  });
}

// Fetch the deployed hash from the /health.txt endpoint
async function fetchDeployedHash() {
  return new Promise((resolve) => {
    const healthUrl = `${siteUrl}/health.txt`;
    const get = healthUrl.startsWith('https:') ? https.get : http.get;
    get(healthUrl, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        const match = data.match(/^words_hash:\s*(\w+)/m);
        if (match) {
          resolve(match[1]);
        } else {
          console.warn('Could not find words_hash in health.txt');
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error(`Error fetching health.txt: ${err.message}`);
      resolve(null);
    });
  });
}

// Ping all search engines
async function pingAll() {
  console.log(`Checking sitemap: ${sitemapUrl}`);
  console.log(`Site URL: ${siteUrl}`);
  if (deployedHashArg && !isForce) {
    const remoteHash = await fetchDeployedHash();
    if (remoteHash === deployedHashArg) {
      console.log('No new content detected (hash matches deployed). Skipping ping.');
      return;
    }
    if (!remoteHash) {
      console.warn('Could not fetch or parse deployed hash. Will ping as fallback.');
    } else {
      console.log(`Hash changed: deployed=${deployedHashArg}, live=${remoteHash}. Will ping search engines.`);
    }
  }
  if (isDryRun) {
    console.log('DRY RUN MODE: Would ping the following services:');
    engineList.forEach(engineObj =>
      console.log(`- ${engineObj.engine.name}: ${engineObj.engine.url}`),
    );
    return;
  }
  engineList.forEach(engineObj =>
    console.log(`Pinging: ${engineObj.engine.name} - ${engineObj.engine.url}`),
  );
  const results = await Promise.all(
    engineList.map(engineObj => pingSearchEngine(engineObj).catch(error => error)),
  );
  results.forEach(result => {
    if (result.error) {
      console.error(`${result.engine}: ${result.error}`);
    } else {
      console.log(`${result.engine}: Status ${result.status}`);
    }
  });
  console.log('Finished pinging search engines');
}

pingAll();
