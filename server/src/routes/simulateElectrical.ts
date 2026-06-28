import { Router, type Request, type Response } from 'express';
import { simulateElectrical, type ElectricalSimRequest } from '../simulation/electrical';

export const simulateElectricalRouter = Router();

simulateElectricalRouter.post('/', (req: Request, res: Response) => {
    const body = req.body as Partial<ElectricalSimRequest>;

    if (!body || !Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
        res.status(400).json({
            ok: false,
            error: 'Request body must contain nodes and edges arrays.',
        });
        return;
    }

    const result = simulateElectrical(body as ElectricalSimRequest);
    res.json(result);
});