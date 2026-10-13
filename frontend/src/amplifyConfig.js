import { Amplify } from 'aws-amplify';

const region = import.meta.env.VITE_AWS_REGION;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;

if (!region || !userPoolId || !userPoolClientId) {
  console.warn(
    '[Amplify] Missing Cognito environment variables. ' +
    'Set VITE_AWS_REGION, VITE_COGNITO_USER_POOL_ID, and VITE_COGNITO_USER_POOL_CLIENT_ID in your .env file.'
  );
}

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: userPoolId || 'us-east-1_placeholder',
      userPoolClientId: userPoolClientId || 'placeholder',
      region: region || 'us-east-1',
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true,
      },
    },
  },
});
