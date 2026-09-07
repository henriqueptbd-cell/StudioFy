import { Router } from 'express';
import { adminRoutes } from './admin.routes.js';
import { authRoutes } from './auth.routes.js';
import { publicRoutes } from './public.routes.js';

const routes = Router();

routes.use(authRoutes);
routes.use(publicRoutes);
routes.use(adminRoutes);

export { routes };