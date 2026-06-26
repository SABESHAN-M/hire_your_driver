import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

let pool;
if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });
}

function mysqlToPostgresQuery(sql) {
  let pgSql = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (char === "'" && (i === 0 || sql[i - 1] !== '\\')) {
      inSingleQuote = !inSingleQuote;
      pgSql += char;
    } else if (char === '"' && (i === 0 || sql[i - 1] !== '\\')) {
      if (!inSingleQuote) {
        pgSql += "'";
      } else {
        pgSql += char;
      }
    } else if (char === '`') {
      pgSql += '"';
    } else {
      pgSql += char;
    }
  }

  // Replace '?' with sequential '$1', '$2', ...
  let sqlWithPlaceholders = '';
  let paramIndex = 1;
  let inPgSingleQuote = false;
  let inPgDoubleQuote = false;

  for (let i = 0; i < pgSql.length; i++) {
    const char = pgSql[i];
    if (char === "'" && (i === 0 || pgSql[i - 1] !== '\\')) {
      inPgSingleQuote = !inPgSingleQuote;
      sqlWithPlaceholders += char;
    } else if (char === '"' && (i === 0 || pgSql[i - 1] !== '\\')) {
      inPgDoubleQuote = !inPgDoubleQuote;
      sqlWithPlaceholders += char;
    } else if (char === '?' && !inPgSingleQuote && !inPgDoubleQuote) {
      sqlWithPlaceholders += `$${paramIndex++}`;
    } else {
      sqlWithPlaceholders += char;
    }
  }

  // Handle IN ($1) -> = ANY($1) for array matching
  let finalSql = sqlWithPlaceholders.replace(/\bIN\s*\(\s*\$(\d+)\s*\)/gi, '= ANY($$1)');

  // Handle MySQL specific RAND() -> random()
  finalSql = finalSql.replace(/\bRAND\(\)/gi, 'random()');

  // Convert MySQL table creation / alter table types to PostgreSQL
  if (finalSql.trim().toUpperCase().includes('CREATE TABLE') || finalSql.trim().toUpperCase().includes('ALTER TABLE')) {
    finalSql = finalSql.replace(/\bINT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY');
    finalSql = finalSql.replace(/\bTINYINT\b/gi, 'SMALLINT');
    finalSql = finalSql.replace(/\bLONGTEXT\b/gi, 'TEXT');
    finalSql = finalSql.replace(/\bON\s+UPDATE\s+CURRENT_TIMESTAMP\b/gi, '');
    finalSql = finalSql.replace(/\bMODIFY\s+COLUMN\s+(\w+)\s+(\w+)(?:\([^)]+\))?\s*(?:NULL|NOT\s+NULL)?/gi, 'ALTER COLUMN $1 TYPE $2');
  }

  return finalSql;
}

const db = {
  query: async (sql, params = []) => {
    let pgSql = mysqlToPostgresQuery(sql);
    
    // Check if query is an INSERT statement to return inserted ID
    const isInsert = pgSql.trim().toUpperCase().startsWith('INSERT');
    if (isInsert && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }

    try {
      const res = await pool.query(pgSql, params);

      if (isInsert) {
        const insertId = res.rows[0] ? res.rows[0].id : null;
        return [{ insertId, affectedRows: res.rowCount }, res.fields];
      }

      const isUpdateOrDelete = pgSql.trim().toUpperCase().startsWith('UPDATE') || pgSql.trim().toUpperCase().startsWith('DELETE');
      if (isUpdateOrDelete) {
        return [{ affectedRows: res.rowCount }, res.fields];
      }

      // SELECT queries
      return [res.rows, res.fields];
    } catch (error) {
      console.error('Database query error on SQL:', pgSql);
      console.error('Original SQL:', sql);
      console.error(error);
      throw error;
    }
  },
  pool: pool
};

export default db;
export { mysqlToPostgresQuery };
