/**
 * Script para registrar / verificar / recrear el subscriber del webhook de AIRA
 * en la Google Health API.
 *
 * Setup (una vez):
 *   1. GCP Console → IAM & Admin → Service Accounts (project: 147327076393)
 *   2. Crea (o reusa) una service account con rol "Health Data Reader"/"Editor"
 *   3. Crea una JSON key → guárdala como scripts/gh-sa-key.json
 *   4. Exporta el secreto en tu shell (NO en este archivo):
 *        export GH_WEBHOOK_SECRET="..."           # bash/zsh
 *        $env:GH_WEBHOOK_SECRET = "..."           # PowerShell
 *      (debe ser el MISMO valor que la env var GH_WEBHOOK_SECRET en Vercel)
 *
 * Comandos:
 *   node scripts/register-gh-webhook.mjs            # crea si no existe (no toca si ya existe)
 *   node scripts/register-gh-webhook.mjs --status   # solo muestra el estado del subscriber
 *   node scripts/register-gh-webhook.mjs --recreate # DELETE + create (úsalo si dejó de entregar)
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

async function getSubscriber(base, headers) {
  const res = await fetch(`${base}/subscribers/${SUBSCRIBER_ID}`, { headers });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function deleteSubscriber(base, headers) {
  console.log('🗑️  Borrando subscriber existente...');
  const res = await fetch(`${base}/subscribers/${SUBSCRIBER_ID}`, { method: 'DELETE', headers });
  if (res.ok) { console.log('   borrado (status ' + res.status + ')'); return; }
  const text = await res.text();
  console.error('❌ Error al borrar (status ' + res.status + '): ' + text);
  process.exit(1);
}

async function createSubscriber(base, headers, secret) {
  const url  = `${base}/subscribers?subscriberId=${SUBSCRIBER_ID}`;
  const body = {
    endpointUri: ENDPOINT_URI,
    subscriberConfigs: [{ dataTypes: DATA_TYPES, subscriptionCreatePolicy: 'AUTOMATIC' }],
    endpointAuthorization: { secret },
  };
  console.log('Registrando webhook subscriber → ' + ENDPOINT_URI);
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

async function main() {
  const mode = process.argv.includes('--recreate') ? 'recreate'
             : process.argv.includes('--status')   ? 'status'
             : 'create';

  const secret = process.env.GH_WEBHOOK_SECRET;
  if (mode !== 'status' && !secret) {
    console.error('ERROR: exporta GH_WEBHOOK_SECRET antes de correr (mismo valor que en Vercel)');
    process.exit(1);
  }

  let sa;
  try {
    sa = JSON.parse(readFileSync(SA_KEY_PATH, 'utf8'));
  } catch {
    console.error(`ERROR: ${SA_KEY_PATH.pathname} no encontrado — descarga la JSON key de la service account y guárdala ahí`);
    process.exit(1);
  }

  console.log('Obteniendo access token con service account...');
  const token = await getAccessToken(sa);
  const base  = `https://health.googleapis.com/v4/projects/${PROJECT_NUMBER}`;
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const existing = await getSubscriber(base, headers);

  // --status: solo reportar el estado actual y salir.
  if (mode === 'status') {
    if (existing.ok) {
      console.log('ℹ️  El subscriber EXISTE:');
      try { console.log(JSON.stringify(JSON.parse(existing.body), null, 2)); } catch { console.log(existing.body); }
    } else {
      console.log(`ℹ️  El subscriber NO existe (status ${existing.status}).`);
      try { console.log(JSON.stringify(JSON.parse(existing.body), null, 2)); } catch { console.log(existing.body); }
    }
    return;
  }

  // --recreate: borrar (si existe) y crear de nuevo. Úsalo cuando dejó de entregar.
  if (mode === 'recreate') {
    if (existing.ok) await deleteSubscriber(base, headers);
    else console.log(`(no existía, status ${existing.status} — creando directo)`);
    await createSubscriber(base, headers, secret);
    return;
  }

  // create (default): no tocar si ya existe.
  if (existing.ok) {
    console.log('ℹ️  El subscriber ya existe — usa --recreate para recrearlo (DELETE + create):');
    try { console.log(JSON.stringify(JSON.parse(existing.body), null, 2)); } catch { console.log(existing.body); }
    return;
  }
  console.log('No existe aún (status ' + existing.status + '), creando...');
  await createSubscriber(base, headers, secret);
}

main();
