const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Verifier is created once and reused (it caches the JWKS)
let verifier = null;

const getVerifier = () => {
  if (!verifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    const region = process.env.AWS_REGION;

    if (!userPoolId || !clientId || !region) {
      throw new Error('Cognito configuration missing: AWS_REGION, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID are required.');
    }

    verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });
  }
  return verifier;
};

const authenticateCognito = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed.' });
    }

    const token = authHeader.slice(7);

    let payload;
    try {
      payload = await getVerifier().verify(token);
    } catch (err) {
      const msg = err.message || 'Token verification failed.';
      // Distinguish common errors for clear client messages
      if (msg.includes('expired')) {
        return res.status(401).json({ error: 'Token expired. Please sign in again.' });
      }
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }

    // Attach verified identity to request — never trust unverified payload
    req.user = {
      sub: payload.sub,
      username: payload.username || payload['cognito:username'],
      email: payload.email,
    };

    next();
  } catch (err) {
    console.error('[Auth] Unexpected error:', err.message);
    res.status(500).json({ error: 'Authentication service error.' });
  }
};

module.exports = authenticateCognito;
