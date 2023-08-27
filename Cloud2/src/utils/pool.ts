import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER || "alex",
    password: process.env.DB_PASSWORD || "alex",
    database: process.env.DB_NAME || "newdatabase",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
});

export default pool;
