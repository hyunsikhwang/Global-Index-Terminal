import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Route for real-time index data
  app.get("/api/market-data", async (req, res) => {
    try {
      const symbols = [
        '^KS11', // KOSPI
        '^KS200', // KOSPI 200
        '^KQ11', // KOSDAQ
        '^IXIC', // NASDAQ
        '^GSPC', // S&P 500
        '^N225', // Nikkei 225
        '^DJI',  // Dow Jones
        '^BSESN', // Sensex
        '^NSEI', // Nifty 50
        'GC=F',  // Gold
        'SI=F',  // Silver
        '^RUT',  // Russell 2000
        'HG=F',  // Copper
        '000300.SS' // CSI 300
      ];

      // Fetch quote for all symbols
      const quotes = await Promise.all(symbols.map(async (symbol) => {
        try {
          return await yahooFinance.quote(symbol);
        } catch (e) {
          console.error(`Error fetching ${symbol}:`, e);
          return null;
        }
      }));

      // Fetch historical data for the chart (last 2 years - more stable)
      const now = new Date();
      const startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 2);

      const historicalDataPromises = symbols.map(async (symbol) => {
        try {
          console.log(`Fetching history for ${symbol}...`);
          return await yahooFinance.historical(symbol, {
            period1: startDate,
            period2: now,
            interval: '1d'
          });
        } catch (e) {
          console.error(`ERROR: Historical data failed for ${symbol}:`, e);
          return [] as any[];
        }
      });

      const history = await Promise.all(historicalDataPromises);

      // Format data for frontend
      const marketData = symbols.map((symbol, i) => {
        const quote = quotes[i];
        let h = history[i] || [];
        
        // Safety filter to ensure data integrity
        h = h.filter(entry => entry && entry.date && entry.close !== null && entry.close !== undefined);

        return {
          symbol,
          price: quote?.regularMarketPrice || 0,
          change: quote?.regularMarketChangePercent || 0,
          high: quote?.regularMarketDayHigh || 0,
          low: quote?.regularMarketDayLow || 0,
          history: h.map((entry: any) => ({
            date: entry.date instanceof Date 
              ? entry.date.toISOString().split('T')[0] 
              : new Date(entry.date).toISOString().split('T')[0],
            close: entry.close
          }))
        };
      });

      res.json(marketData);
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
