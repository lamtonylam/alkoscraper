import express from "express";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
    try {
        chromium.use(StealthPlugin());
        // New way to overwrite the default options of stealth evasion plugins
        // https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth/evasions
        chromium.plugins.setDependencyDefaults(
            "stealth/evasions/webgl.vendor",
            {
                vendor: "Bob",
                renderer: "Alice",
            },
        );
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // if example.com/?id=123
        if (req.query.id) {
            await page.goto(`https://www.alko.fi/tuotteet/${req.query.id}/`);
        } else {
            await page.goto("https://www.alko.fi/tuotteet/000706/");
        }

        const content = await page.content();

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

        await browser.close();

        res.json({ price: combinedPrice });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
