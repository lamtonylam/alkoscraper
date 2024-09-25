const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    await page.goto("https://www.alko.fi/tuotteet/000706/Jaloviina-/");

    const content = await page.content();
    const spanElement = await page.$(
        'span.js-price-container.price-wrapper.price.module-price[itemprop="price"]'
    );

    console.log(spanElement);

    fs.writeFileSync("alkopage.txt", content);

    await browser.close();
})();
