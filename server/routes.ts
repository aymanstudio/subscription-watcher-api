import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";

const RATES_CACHE_TTL = 6 * 60 * 60 * 1000;
let cachedRatesResponse: { data: any; fetchedAt: number } | null = null;

async function fetchFromOpenExchangeRates(): Promise<any> {
  const apiKey = process.env.OPEN_EXCHANGE_KEY;
  if (!apiKey || apiKey.length < 10) {
    throw new Error("OPEN_EXCHANGE_KEY not configured or too short");
  }

  const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`OpenExchangeRates HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data.rates !== "object") throw new Error("Invalid response from OpenExchangeRates");
    return data;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchFromFreeApi(): Promise<any> {
  const url = "https://open.er-api.com/v6/latest/USD";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Free API HTTP ${res.status}`);
    const data = await res.json();
    if (!data || typeof data.rates !== "object" || data.result === "error") {
      throw new Error("Invalid response from free API");
    }
    return data;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchRates(): Promise<any> {
  try {
    return await fetchFromOpenExchangeRates();
  } catch {
    return await fetchFromFreeApi();
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for Render
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/exchange-rates", async (_req: Request, res: Response) => {
    try {
      const now = Date.now();

      if (cachedRatesResponse && now - cachedRatesResponse.fetchedAt < RATES_CACHE_TTL) {
        return res.json(cachedRatesResponse.data);
      }

      const data = await fetchRates();
      cachedRatesResponse = { data, fetchedAt: now };
      return res.json(data);
    } catch (err: any) {
      if (cachedRatesResponse) {
        return res.json(cachedRatesResponse.data);
      }
      return res.status(502).json({ error: err.message || "Failed to fetch rates" });
    }
  });

  app.post("/api/exchange-rates/refresh", async (_req: Request, res: Response) => {
    try {
      const data = await fetchRates();
      cachedRatesResponse = { data, fetchedAt: Date.now() };
      return res.json(data);
    } catch (err: any) {
      return res.status(502).json({ error: err.message || "Failed to fetch rates" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
