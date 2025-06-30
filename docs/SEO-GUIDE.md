# SEO and URL Normalization Documentation

This document outlines the SEO and URL normalization strategies implemented in the wordbug project.

## URL Structure and Canonicalization

All URLs in the wordbug site follow these normalization rules:

1. **Lowercase URLs**: All URLs are normalized to lowercase in our utilities (`getUrl`, `getFullUrl`, etc.)
2. **No Trailing Slashes**: Content pages have no trailing slashes (except for the root URL '/')
3. **Consistent Protocol**: Uses HTTPS in production (configured via environment variables)
4. **Canonical Tags**: Every page includes proper canonical tags pointing to the normalized URL

## Case-Sensitivity Handling

Since static sites are inherently case-sensitive (because they're based on the filesystem), we've implemented two layers of protection:

1. **Client-Side**: All internal links are generated using lowercase via the `getUrl()` utility
2. **Server/CDN Level**: A Cloudflare Transform Rule handles case normalization for user-typed URLs

### Cloudflare Transform Rule

The following rule is configured in Cloudflare to handle URLs with uppercase letters:

```
(http.request.uri.path wildcard r"/*([A-Z])*")
```

With the transform action:

```
lower(http.request.uri.path)
```

This rule identifies any URL path containing uppercase letters and converts it to lowercase before serving the content, preventing 404 errors.

## SEO Features

The site implements the following SEO best practices:

1. **Sitemap**: An automatically generated sitemap with standard lastmod dates
   - Excludes API endpoints and health checks
   - Updates the lastmod date with each build

2. **Redirects**: Date-based URLs (e.g., `/20250330`) redirect to word URLs (e.g., `/epilepsy`) with a 301 status code

3. **Meta Tags**: Complete Open Graph, Twitter Card, and standard meta tags

4. **Structured Data**: Rich structured data for word definitions

5. **Health Endpoint**: A `/health` endpoint provides version and build information in plain text format

## Monitoring and Maintenance

- The health endpoint (`/health`) provides version and build timestamp information in a simple text format
- Search engine pinging is available after deployment with the following command:
  ```
  npm run tool:ping-search-engines
  ```

  Or automatically as part of your deployment process:
  ```
  npm run postdeploy
  ```

  This notifies Google, Bing, and Ping-O-Matic about your updated sitemap.

  The ping script includes intelligent change detection to avoid unnecessary pings when content hasn't changed.

  Options:
  - `--dry-run`: Show what would be pinged without actually sending requests
  - `--force`: Ping services even if no content changes are detected
