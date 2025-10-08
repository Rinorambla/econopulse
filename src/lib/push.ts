import fs from 'fs';
import path from 'path';

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'data-snapshots', 'push-subscriptions.json');

export interface PushSubscriptionRecord {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
  createdAt: string;
}

function readAll(): PushSubscriptionRecord[] {
  try {
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(list: PushSubscriptionRecord[]) {
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

export function saveSubscription(sub: PushSubscriptionRecord) {
  const all = readAll();
  if (!all.find(s => s.endpoint === sub.endpoint)) {
    all.push(sub);
    writeAll(all);
  }
}

export function listSubscriptions() {
  return readAll();
}
