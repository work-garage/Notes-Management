const { createClient } = require('redis');

let redisClient = null;
let isConnected = false;

const connectRedis = async () => {
  // Allow caching to be explicitly disabled (e.g. local dev without a Redis server).
  // Set REDIS_ENABLED=false in your .env to skip the connection entirely.
  if (process.env.REDIS_ENABLED === 'false') {
    console.log('[Redis] Caching disabled via REDIS_ENABLED=false.');
    return;
  }

  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);

  if (!host) {
    console.log('[Redis] REDIS_HOST not configured — caching disabled.');
    return;
  }

  const clientOptions = {
    socket: {
      host,
      port,
      tls: process.env.REDIS_TLS === 'true',
      reconnectStrategy: (retries) => {
        if (retries > 3) {
          console.warn('[Redis] Max reconnect attempts reached. Caching disabled.');
          return false; // stop retrying
        }
        return Math.min(retries * 200, 2000);
      },
    },
  };

  // Only set password when the variable is present and non-empty.
  // This cluster does not use an AUTH token — omit REDIS_PASSWORD entirely.
  if (process.env.REDIS_PASSWORD) {
    clientOptions.password = process.env.REDIS_PASSWORD;
  }

  redisClient = createClient(clientOptions);

  redisClient.on('connect', () => {
    isConnected = true;
    console.log(`[Redis] Connected to ${host}:${port}`);
  });

  redisClient.on('error', (err) => {
    isConnected = false;
    // Log the error type but never the full connection string or password
    console.error(`[Redis] Error: ${err.code || err.message}`);
  });

  redisClient.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.warn(`[Redis] Initial connection failed (${err.code || err.message}). Continuing without cache.`);
    isConnected = false;
    redisClient = null;
  }
};

const getRedisClient = () => (isConnected ? redisClient : null);

const isRedisAvailable = () => isConnected && redisClient !== null;

module.exports = { connectRedis, getRedisClient, isRedisAvailable };
