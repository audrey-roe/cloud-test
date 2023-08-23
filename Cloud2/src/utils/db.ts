import { Pool } from 'pg';

let localPoolConfig = {
  user: 'alex',
  password: 'alex',
  host: 'localhost',
  port: 5432,
  database: 'newdatabase'
};

const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
} : localPoolConfig;

const pool = new Pool(poolConfig);
export default pool;