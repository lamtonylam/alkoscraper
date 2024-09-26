const express = require("express");
const { chromium } = require("playwright");
const fs = require("fs");

const app = express();
const port = 3000;

app.get("/", async (req, res) => {
    try {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        await page.goto("https://www.alko.fi/tuotteet/000706/");

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
