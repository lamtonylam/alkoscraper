import express from "express";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const app = express();
const port = 3000;

// Stealth setup once. Per-request setup leaked memory.
chromium.use(StealthPlugin());
chromium.plugins.setDependencyDefaults("stealth/evasions/webgl.vendor", {
    vendor: "Bob",
    renderer: "Alice",
});

// Single browser reused across requests. Launch-per-request spiked CPU/RAM.
let browserPromise = null;
function getBrowser() {
    if (!browserPromise) {
        browserPromise = chromium.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage", // /dev/shm tiny in Docker, crash without this
                "--disable-gpu",
                "--disable-extensions",
                "--no-first-run",
                "--no-zygote",
            ],
        });
        browserPromise.catch(() => { browserPromise = null; });
    }
    return browserPromise;
}

app.get("/health", (req, res) => res.sendStatus(200));

app.get("/", async (req, res) => {
    let context = null;
    try {
        const browser = await getBrowser();
        context = await browser.newContext({
            userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        });
        const page = await context.newPage();

        // Block images/fonts/media. Cuts bandwidth + RAM on scrape.
        await page.route("**/*", (route) => {
            const type = route.request().resourceType();
            if (["image", "media", "font", "stylesheet"].includes(type)) {
                return route.abort();
            }
            return route.continue();
        });

        const id = req.query.id || "000706";
        await page.goto(`https://www.alko.fi/tuotteet/${id}/`, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
        });

        // Extract euro amount
        const euroElement = await page.$(
            'span[class*="text-[2.5rem]"][class*="font-semibold"]',
        );
        const euroAmount = await euroElement.textContent();

        // Extract cent amount
        const centElement = await page.$(
            'span[class*="text-[1.5rem]"][class*="underline"]',
        );
        const centAmount = await centElement.textContent();

        const combinedPrice = `${euroAmount}.${centAmount}`;

        res.json({ price: combinedPrice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Close context/page only. Browser stays warm for next request.
        if (context) await context.close().catch(() => {});
    }
});

// Graceful shutdown. Flushes browser on deploy/restart.
async function shutdown() {
    try {
        if (browserPromise) (await browserPromise)?.close().catch(() => {});
    } finally {
        process.exit(0);
    }
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
