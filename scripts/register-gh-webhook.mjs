/**
 * One-time script to register the AIRA webhook subscriber with the Google Health API.
 *
 * Usage:
 *   1. Go to GCP Console → IAM & Admin → Service Accounts
 *      (project: 147327076393 / tu proyecto de Google Health)
 *   2. Create a service account (o usa uno existente)
 *   3. Grant it the role: "Health Data Reader" o "Editor" del proyecto
 *   4. Create a JSON key → save it as scripts/gh-sa-key.json
 *   5. Set GH_WEBHOOK_SECRET in your shell (NOT in this file):
 *        $env:GH_WEBHOOK_SECRET = "your-secret-here"   # PowerShell
 *   6. Run:
 *        node scripts/register-gh-webhook.mjs
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';

const SA_KEY_PATH = new URL('./gh-sa-key.json', import.meta.url);
const PROJECT_NUMBER = '147327076393';
const SUBSCRIBER_ID  = 'aira-webhook';
const ENDPOINT_URI   = 'https://fitbit-dashboard-zeta.vercel.app/api/google/webhook';
const DATA_TYPES     = ['steps', 'distance', 'floors', 'sleep'];

async function getAccessToken(sa) {
  const now   = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const msg     = `${header}.${payload}`;

  const sign = createSign('RSA-SHA256');
  sign.update(msg);
  const sig = sign.sign(sa.private_key, 'base64url');
  const jwt = `${msg}.${sig}`;

  const res  = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(json));
  return json.access_token;
}

async function main() {
  const secret = process.env.GH_WEBHOOK_SECRET;
  if (!secret) {
    console.error('ERROR: set GH_WEBHOOK_SECRET env var before running this script');
    process.exit(1);
  }

  let sa;
  try {
    sa = JSON.parse(readFileSync(SA_KEY_PATH, 'utf8'));
  } catch {
    console.error(`ERROR: ${SA_KEY_PATH.pathname} not found — download a service account JSON key and save it there`);
    process.exit(1);
  }

  console.log('Obteniendo access token con service account...');
  const token = await getAccessToken(sa);
  const base  = `https://health.googleapis.com/v4/projects/${PROJECT_NUMBER}`;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ── Check if subscriber already exists ───────────────────────────────────────
  console.log('Verificando si el subscriber ya existe...');
  const getRes = await fetch(`${base}/subscribers/${SUBSCRIBER_ID}`, { headers });
  if (getRes.ok) {
    const existing = await getRes.json();
    console.log('ℹ️  El subscriber ya existe:');
    console.log(JSON.stringify(existing, null, 2));
    console.log('\nSi quieres recrearlo, primero bórralo con:');
    console.log(`  DELETE ${base}/subscribers/${SUBSCRIBER_ID}`);
    return;
  }
  console.log('No existe aún (status ' + getRes.status + '), creando...');

  // ── Create subscriber ─────────────────────────────────────────────────────────
  const url  = `${base}/subscribers?subscriberId=${SUBSCRIBER_ID}`;
  const body = {
    endpointUri: ENDPOINT_URI,
    subscriberConfigs: [{ dataTypes: DATA_TYPES, subscriptionCreatePolicy: 'AUTOMATIC' }],
    endpointAuthorization: { secret },
  };

  console.log('Registrando webhook subscriber...');
  console.log('Body:', JSON.stringify(body, null, 2));
  const res  = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text();

  if (res.ok) {
    console.log('✅ Subscriber registrado exitosamente (status ' + res.status + ')');
    try { console.log(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.log(text); }
  } else {
    console.error('❌ Error (status ' + res.status + '):');
    try { console.error(JSON.stringify(JSON.parse(text), null, 2)); } catch { console.error(text); }
    process.exit(1);
  }
}

main();
