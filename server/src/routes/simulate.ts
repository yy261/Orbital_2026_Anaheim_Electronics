import { Router, type Request, type Response } from 'express';
import { simulateLogic, type LogicSimRequest } from '../simulation/logic';

export const simulateRouter = Router();

simulateRouter.post('/logic', (req: Request, res: Response) => {
  const body = req.body as Partial<LogicSimRequest>;

  if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    return res.status(400).json({
      ok: false,
      error: 'Request body must contain nodes and edges arrays.',
    });
  }

  const result = simulateLogic(body as LogicSimRequest);
  res.json(result);
});