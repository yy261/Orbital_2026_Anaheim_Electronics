import { Router, type Request, type Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'logic-sim-server',
    time: new Date().toISOString(),
  });
});
