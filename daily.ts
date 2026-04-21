import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { generateDigest, sendViaEmailTo } from './digest.js';
import { listActive } from './subscribers.js';

export async function runDailyDigests(): Promise<{ sent: number; failed: number }> {
  const subscribers = await listActive();
  let sent = 0;
  let failed = 0;

  for (const sub of subscribers) {
    if (sub.topics.length === 0) continue;
    const topic = sub.topics[Math.floor(Math.random() * sub.topics.length)];
    try {
      const digest = await generateDigest(topic);
      await sendViaEmailTo(digest, topic, sub.email);
      console.log(`✅  Sent "${topic}" to ${sub.email}`);
      sent++;
    } catch (err) {
      console.error(`❌  Failed for ${sub.email}: ${(err as Error).message}`);
      failed++;
    }
  }

  return { sent, failed };
}

const __filename = fileURLToPath(import.meta.url);
if (resolve(process.argv[1] ?? '') === resolve(__filename)) {
  runDailyDigests()
    .then(({ sent, failed }) => console.log(`Done: ${sent} sent, ${failed} failed.`))
    .catch(err => { console.error(err); process.exit(1); });
}
