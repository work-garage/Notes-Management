require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

const PORT = parseInt(process.env.PORT || '5000', 10);

const start = async () => {
  await connectDB();
  await connectRedis();

  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
};

start().catch((err) => {
  console.error('[Server] Failed to start:', err.message);
  process.exit(1);
});
