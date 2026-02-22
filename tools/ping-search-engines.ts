#!/usr/bin/env node

/**
 * Search Engine Ping Service
 *
 * This script pings search engines to notify them about sitemap updates.
 * Run this script after deploying new content to help search engines discover changes faster.
 *
 * Usage: node ping-search-engines.js [--site-url URL] [--deployed-hash HASH] [--dry-run] [--force]
 *
 * Options:
 *   --site-url      The base URL of the deployed site (e.g. https://example.com)
 *   --deployed-hash The hash of the deployed content (for change detection)
 *   --dry-run       Don't actually ping services, just show what would be pinged
 *   --force         Ping regardless of content change detection
 */

import http from 'http';
import https from 'https';
import { parseArgs } from 'node:util';
import { URL } from 'url';

import { exit, logger } from '#utils/logger';

// Parse command line arguments
const { values: cliValues } = parseArgs({
  args: process.argv.slice(2),
  options: {
    'site-url': { type: 'string' },
    'deployed-hash': { type: 'string' },
    'dry-run': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
  strict: true,
});

const isDryRun = !!cliValues['dry-run'];
const isForce = !!cliValues.force;
const siteUrlArg = cliValues['site-url'];
const deployedHashArg = cliValues['deployed-hash'];

if (!siteUrlArg) {
  logger.error('Site URL required');
  process.exit(1);
}

const siteUrl = siteUrlArg.endsWith('/') ? siteUrlArg.slice(0, -1) : siteUrlArg;
const sitemapUrl = `${siteUrl}/sitemap-index.xml`;

// List of working sitemap notification services
const engineList = [
  {
    engine: {
      name: 'Ping-O-Matic',
      url: `http://rpc.pingomatic.com/ping/?title=${encodeURIComponent(process.env.SITE_TITLE || 'Occasional Word of the Day')}&blogurl=${encodeURIComponent(siteUrl)}&rssurl=${encodeURIComponent(sitemapUrl)}&chk_weblogscom=on&chk_google=on`,
    },
  },
];

interface SearchEngine {
  name: string;
  url: string;
}

interface SearchEngineConfig {
  engine: SearchEngine;
}

interface PingResult {
  engine: string;
  status?: number;
  error?: string;
  data?: string;
}

/**
 * Pings a search engine with sitemap notification
 * @param engineObj - Search engine configuration object
 * @returns Promise resolving to ping result
 */
function pingSearchEngine(engineObj: SearchEngineConfig): Promise<PingResult> {
  const engine = engineObj.engine;
  return new Promise((resolve, reject) => {
    logger.info('Pinging search engine', { engine: engine.name });
    const url = new URL(engine.url);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
    };

    // Use http for http URLs, https for https URLs
    const requestLib = url.protocol === 'https:' ? https : http;

    const req = requestLib.request(options, (res) => {
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

/**
 * Fetches the deployed word hash from the /health.txt endpoint for change detection
 * @returns Promise resolving to the deployed hash or null if not found
 */
async function fetchDeployedHash(): Promise<string | null> {
  return new Promise((resolve) => {
    const healthUrl = `${siteUrl}/health.txt`;
    const get = healthUrl.startsWith('https:') ? https.get : http.get;
    get(healthUrl, (res) => {
      let data = '';
      res.on('data', chunk => {
 data += chunk;
});
      res.on('end', () => {
        const match = data.match(/^words_hash:\s*(\w+)/m);
        if (match && match[1]) {
          resolve(match[1]);
        } else {
          logger.warn('Could not find words_hash in health.txt');
          resolve(null);
        }
      });
    }).on('error', (err) => {
      logger.error('Failed to fetch health.txt', { error: err.message });
      resolve(null);
    });
  });
}

/**
 * Pings all configured search engines with sitemap updates
 * Includes change detection to avoid unnecessary pings
 */
async function pingAll(): Promise<void> {
  logger.info('Checking sitemap', { sitemapUrl, siteUrl });
  if (deployedHashArg && !isForce) {
    const remoteHash = await fetchDeployedHash();
    if (remoteHash === deployedHashArg) {
      logger.info('No new content detected (hash matches deployed). Skipping ping.');
      return;
    }
    if (!remoteHash) {
      logger.warn('Could not fetch or parse deployed hash. Will ping as fallback.');
    } else {
      logger.info('Hash changed, will ping search engines', { deployed: deployedHashArg, live: remoteHash });
    }
  }
  if (isDryRun) {
    logger.info('DRY RUN MODE: Would ping the following services:');
    engineList.forEach(engineObj =>
      logger.info('Service to ping', { engine: engineObj.engine.name, url: engineObj.engine.url }),
    );
    return;
  }
  engineList.forEach(engineObj =>
    logger.info('Pinging service', { engine: engineObj.engine.name, url: engineObj.engine.url }),
  );
  const results = await Promise.all(
    engineList.map(engineObj => pingSearchEngine(engineObj).catch(error => error)),
  );

  results.forEach(result => {
    if (result.error) {
      logger.error('Failed to ping search engine', { engine: result.engine, error: result.error });
      return;
    }
    logger.info('Successfully pinged search engine', { engine: result.engine, status: result.status });
  });
  logger.info('Finished pinging search engines');
}

pingAll().catch(async (error) => {
  logger.error('Failed to complete ping service', { error: error.message });
  await exit(0); // Exit with success to not fail workflows
});
