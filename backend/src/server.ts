import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { routes } from './routes/index.js';
import { errorHandler } from './shared/middlewares/errorHandler.js';

const app = express();

// Middlewares de Segurança e Parsing
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL }));
app.use(express.json());

// Rota de Healthcheck do Servidor
app.get('/health', (_request, response) => {
    return response.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Registro das Rotas da Aplicação (/api/v1/...)
app.use(routes);

// Middleware Global de Tratamento de Erros (Obrigatório vir após as rotas)
app.use(errorHandler);

app.listen(env.PORT, () => {
    console.log(`🚀 StudioFy API rodando com sucesso em http://localhost:${env.PORT}`);
});