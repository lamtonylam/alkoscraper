const express = require("express");
const { chromium } = require("playwright-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");

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
            }
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
        const spanElement = await page.$(
            'span.js-price-container.price-wrapper.price.module-price[itemprop="price"]'
        );
        const spanContent = await spanElement.getAttribute("content");

        fs.writeFileSync("alkopage.txt", content);

        await browser.close();

        res.json({ price: spanContent });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
