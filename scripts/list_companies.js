const { Client } = require('pg');

const candidates = [
  'postgres://localhost:54400/postgres',
  'postgres://postgres@localhost:54400/postgres',
  'postgres://paperclip@localhost:54400/paperclip',
  'postgres://postgres@localhost:54400/paperclip',
  'postgres://localhost:54400/paperclip',
];

async function tryConnect(url) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    const res = await client.query(`select id, name, status, issue_prefix from companies order by created_at desc limit 100`);
    console.log('OK', url);
    console.table(res.rows);
    await client.end();
    return true;
  } catch (err) {
    // console.error('ERR', url, err.message);
    return false;
  }
}

(async () => {
  for (const url of candidates) {
    process.stdout.write(`Trying ${url} ... `);
    const ok = await tryConnect(url);
    if (ok) return;
    console.log('failed');
  }
  console.error('No connection succeeded. You can set DATABASE_URL env var to connect.');
  process.exit(1);
})();
