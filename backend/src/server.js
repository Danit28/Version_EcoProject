import dotenv from 'dotenv';
import { app } from './app.js';

dotenv.config();

// Solo escucha en local; en Vercel se exporta el app como handler
if (!process.env.VERCEL) {
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`API escuchando en http://localhost:${port}`);
  });
}

export default app;