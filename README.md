# Vlana status

[![collect](../../actions/workflows/collect.yml/badge.svg)](../../actions/workflows/collect.yml)

Live status of the [Vlana](https://github.com/getvlana/vlana) network: **[getvlana.github.io/status](https://getvlana.github.io/status/)**

Every 15 minutes a GitHub Action asks the network how it's doing and commits the answer here. The history isn't kept by us: it lives in this repo's git log, one commit per sample, and anyone can audit it.

<!-- status -->
**🔴 API unreachable** · 0 countries · — SOL paid to operators · checked 2026-10-28 10:17 UTC

| node | country | line | now | latency | 24h | 7d |
|---|---|---|---|---|---|---|
| `fi-01` | FI | datacenter | 🔴 | — | — | 100% |
| `us-02` | US | datacenter | 🔴 | — | — | 100% |
<!-- /status -->

## What's in here

| file | what |
|---|---|
| [`collect.mjs`](collect.mjs) | one sample: reads `/api/network` and `/api/payouts`, appends to the history, rewrites the table above |
| [`data/latest.json`](data/latest.json) | the last sample: every node, online now, latency, 24h and 7d uptime |
| [`data/history.json`](data/history.json) | 30 days of samples, per node `[time, online, ms]`, network `[time, api up, nodes online, countries, SOL paid]` |
| [`index.html`](index.html) | the status page, served by GitHub Pages straight from this repo |

Run a sample yourself:

```sh
node collect.mjs   # needs Node 20+, no dependencies
```

Point it at your own Vlana deployment with `VLANA_API=https://your.host node collect.mjs`.

## License

AGPL-3.0, same as [getvlana/vlana](https://github.com/getvlana/vlana).
