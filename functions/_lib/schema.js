// สร้างตาราง/ดัชนีถ้ายังไม่มี + helper CORS/JSON
export async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS harvest(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      weight REAL NOT NULL CHECK (weight >= 0)
    );`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_harvest_date ON harvest(date);`),

    db.prepare(`CREATE TABLE IF NOT EXISTS sales(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      weight REAL NOT NULL CHECK (weight >= 0),
      price REAL NOT NULL CHECK (price >= 0)
    );`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);`),

    db.prepare(`CREATE TABLE IF NOT EXISTS production(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount >= 0)
    );`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_production_date ON production(date);`),

    db.prepare(`CREATE TABLE IF NOT EXISTS blooming(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount >= 0)
    );`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_blooming_date ON blooming(date);`),

    db.prepare(`CREATE TABLE IF NOT EXISTS finance(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      kind TEXT NOT NULL,   -- income|expense
      amount REAL NOT NULL CHECK (amount >= 0),
      description TEXT NOT NULL
    );`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_finance_date ON finance(date);`)
  ]);
}

export function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*'; // ถ้า front คนละโดเมน แนะนำระบุเป็นโดเมนของคุณแทน *
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'content-type,authorization'
  };
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
}
