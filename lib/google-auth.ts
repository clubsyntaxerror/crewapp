import { encode } from 'react-native-jwt-io';

interface ServiceAccountCredentials {
  clientEmail: string;
  privateKey: string;
}

interface JWTClaims {
  iss: string;
  scope: string;
  aud: string;
  exp: number;
  iat: number;
}

const TOKEN_DURATION = 3600; // 1 hour in seconds

export async function generateAccessToken(
  credentials: ServiceAccountCredentials
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const claims: JWTClaims = {
    iss: credentials.clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + TOKEN_DURATION,
    iat: now,
  };

  // Create JWT
  const jwt = encode(claims, credentials.privateKey, 'RS256');

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}
