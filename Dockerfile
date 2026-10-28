# Slim base, Chromium only. Full Playwright image ~2GB, this ~1GB.
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_GC=1

WORKDIR /app

# Playwright OS deps first (cached layer)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Prod deps only (skip @playwright/test, @types/node)
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Browsers must match the runtime playwright version from package-lock.json.
# Use the LOCAL Playwright CLI via node directly: `npx` (bare or with @version)
# fails in this build stage with `playwright: not found` (exit 127), and a
# hardcoded `npx -y playwright@X` version skews from runtime -> missing
# executable (e.g. chromium_headless_shell-1217). Local CLI always matches.
RUN node ./node_modules/playwright/cli.js install --with-deps chromium \
    && ls /ms-playwright \
    && chown -R node:node /ms-playwright \
    && rm -rf /root/.cache /tmp/*

COPY index.js ./

# Run as non-root. Low rights, low risk.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

# Heap cap stops OOM kills on small VPS.
CMD ["node", "--max-old-space-size=512", "index.js"]
