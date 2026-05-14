import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { apiRouter } from './routes/index.js';

export const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'version-eco-api' });
});

app.use(apiRouter); 

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.code === '23505') {
    return res.status(409).json({ error: 'Registro duplicado', detail: err.detail });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Violacion de llave foranea', detail: err.detail });
  }

  if (err.code === 'P0001') {
    return res.status(400).json({ error: 'Regla de negocio', detail: err.message });
  }

  return res.status(500).json({ error: 'Error interno del servidor', detail: err.message });
});