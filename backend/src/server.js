import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import propertyRoutes from './routes/properties.js';
import interactionRoutes from './routes/interactions.js';
import recommendationRoutes from './routes/recommendations.js';
import uploadRoutes from './routes/upload.js';
import transactionRoutes from './routes/transactions.js';
import sellerCreditsRoutes from './routes/sellerCredits.js';
import subscriptionRoutes from './routes/subscription.js';
import analyticsRoutes from './routes/analytics.js';
import agencyRoutes from './routes/agency.js';
import adminRoutes from './routes/admin.js';
import documentRoutes from './routes/documents.js';
import purchaseIntentRoutes from './routes/purchaseIntents.js';
import saleInstallmentRoutes from './routes/saleInstallments.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

function isPrivateHostname(hostname) {
  // RFC1918 + localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  const m = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (m) {
    const n = Number(m[1]);
    if (n >= 16 && n <= 31) return true;
  }
  return false;
}

const isProd = process.env.NODE_ENV === 'production';
const allowedOrigins = [
  // 'https://realnest-two.vercel.app', // ← yahan frontend ka URL daalo, backend ka nahi
  'http://localhost:3000',
  'https://realnest-yc68.vercel.app'
];

// app.use(
//   cors(
//     isProd
//       ? {
//           origin: (origin, callback) => {
//             if (!origin) return callback(null, true);
//             try {
//               const { hostname } = new URL(origin);
//               if (isPrivateHostname(hostname)) return callback(null, true);
//             } catch {
//               /* ignore */
//             }
//             callback(new Error('Not allowed by CORS'));
//           },
//           credentials: true,
//         }
//       : { origin: true, credentials: true }
//   )
// );

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/seller', sellerCreditsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/agency', agencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/purchase-intents', purchaseIntentRoutes);
app.use('/api/sale-installments', saleInstallmentRoutes);

// Global error handler - catches unhandled errors and returns proper 500
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
});

// app.listen(PORT, HOST, () => {
//   console.log(`Server running on http://${HOST}:${PORT}`);
// });

export default app;