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

# Chromium version synced from package-lock.json. Do NOT hardcode a
# different playwright version — mismatched browser build = missing
# executable at runtime (e.g. chromium_headless_shell-1217).
# NOTE: bare `npx playwright` fails in this build (exit 127,
# `playwright: not found`), so fetch the explicit version like before.
RUN PW_VERSION=$(node -p "require('./package-lock.json').packages['node_modules/playwright'].version") \
    && echo "Installing Playwright browsers for v$PW_VERSION" \
    && npx -y "playwright@$PW_VERSION" install --with-deps chromium \
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
