import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('Falta la variable DATABASE_URL en backend/.env');
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
