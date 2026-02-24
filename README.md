# Subscription Watcher API

Exchange rates API server for the Subscription Watcher mobile app.

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/exchange-rates` - Get latest exchange rates (cached 6 hours)
- `POST /api/exchange-rates/refresh` - Force refresh exchange rates

## Environment Variables

- `OPEN_EXCHANGE_KEY` - OpenExchangeRates API key
- `NODE_ENV` - Environment (production/development)
- `PORT` - Server port (default: 5000)

## Deployment on Render

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
