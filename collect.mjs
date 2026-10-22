#!/usr/bin/env node
// Samples the live Vlana network and keeps 30 days of history in data/.
// Runs every 15 minutes from GitHub Actions, so the history is GitHub's view, not ours.
import fs from 'node:fs';

const API = process.env.VLANA_API || 'https://go.vlana.app';
const KEEP = 30 * 86400e3;
const HIST = 'data/history.json';

const get = async p => {
  const r = await fetch(API + p, { signal: AbortSignal.timeout(20e3) });
  if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
  return r.json();
};

const t = Math.floor(Date.now() / 60e3) * 60e3;
const h = fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, 'utf8')) : { network: [], nodes: {} };

let net = null, pay = null, err = null;
try { [net, pay] = await Promise.all([get('/api/network'), get('/api/payouts')]); } catch (e) { err = e.message; }

// [time, api up, nodes online, countries, SOL paid]
h.network.push(net ? [t, 1, net.online, net.countries, +(+net.paid || 0).toFixed(6)] : [t, 0, 0, 0, null]);
if (net) for (const n of net.nodes) {
  const x = h.nodes[n.name] ||= { country: n.country, home: n.home, operator: n.operator, since: n.since || t, samples: [] };
  Object.assign(x, { country: n.country, home: n.home, operator: n.operator });
  x.samples.push([t, n.online ? 1 : 0, n.latency ?? null]); // [time, online, ms]
}
h.network = h.network.filter(s => s[0] > t - KEEP);
for (const [name, x] of Object.entries(h.nodes)) {
  x.samples = x.samples.filter(s => s[0] > t - KEEP);
  if (!x.samples.length) delete h.nodes[name];
}

const up = (samples, ms) => {
  const s = samples.filter(x => x[0] > t - ms);
  return s.length ? s.reduce((a, x) => a + x[1], 0) / s.length : null;
};
const nodes = Object.entries(h.nodes).map(([name, x]) => {
  const last = x.samples.at(-1);
  return { name, country: x.country, home: x.home, online: last[0] === t && !!last[1], latency: last[0] === t ? last[2] : null, up24: up(x.samples, 86400e3), up7: up(x.samples, 7 * 86400e3) };
}).sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));
const latest = {
  at: t, api: !!net, error: err, online: net?.online ?? 0, total: nodes.length, countries: net?.countries ?? 0,
  paid: net ? +net.paid || 0 : null, round: pay?.round?.n ?? null, onchain: pay?.rounds?.find(r => r.memo)?.n ?? null, nodes,
};

fs.mkdirSync('data', { recursive: true });
fs.writeFileSync(HIST, JSON.stringify(h));
fs.writeFileSync('data/latest.json', JSON.stringify(latest, null, 1));

// README table between the markers
const pct = v => v == null ? '—' : (v * 100).toFixed(v === 1 ? 0 : 1) + '%';
const table = [
  `**${latest.api ? (latest.online === latest.total ? '🟢 all nodes up' : `🟡 ${latest.online} of ${latest.total} nodes up`) : '🔴 API unreachable'}** · ${latest.countries} countries · ${latest.paid ?? '—'} SOL paid to operators · checked ${new Date(t).toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  '',
  '| node | country | line | now | latency | 24h | 7d |',
  '|---|---|---|---|---|---|---|',
  ...nodes.map(n => `| \`${n.name}\` | ${n.country} | ${n.home ? 'home' : 'datacenter'} | ${n.online ? '🟢' : '🔴'} | ${n.latency ? n.latency + ' ms' : '—'} | ${pct(n.up24)} | ${pct(n.up7)} |`),
].join('\n');
const readme = fs.readFileSync('README.md', 'utf8').replace(/<!-- status -->[\s\S]*<!-- \/status -->/, `<!-- status -->\n${table}\n<!-- /status -->`);
fs.writeFileSync('README.md', readme);

console.log(err ? `api down: ${err}` : `${latest.online}/${latest.total} nodes up`);
fs.writeFileSync(process.env.GITHUB_OUTPUT || '/dev/null', `summary=${latest.api ? `${latest.online}/${latest.total} nodes up` : 'api down'}\n`, { flag: 'a' });
