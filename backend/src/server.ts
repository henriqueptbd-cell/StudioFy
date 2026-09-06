import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.listen(env.PORT, () => {
  console.log(`StudioFy API disponivel em http://localhost:${env.PORT}`);
});