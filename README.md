# Alkoscraper
For scraping alko.fi prices

## Local usage
Install dependencies
```
npm install && npx playwright install --with-deps
```
to start server:
```
npm start
```

to find price of jaloviina 0.5l one star:
```
http://localhost:3000/
```

to find specific product id: 
```
http://localhost:3000/?id=PRODUCTID
```


For example to find price of karhu sixpack:  
```
http://localhost:3000/?id=710578
```


## Hosting
Install command:
```
npm ci && npx playwright install --with-deps
```
to start server:
```
npm start
```
