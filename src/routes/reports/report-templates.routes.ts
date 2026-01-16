import { Router } from 'express';
import * as controller from '@/controllers/reports/report-templates.controller';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validateRequest';
import * as schema from '@contracts/api/report-templates.contract';

const router = Router();
router.use(authenticate);

router.post('/', authorize('reports:create'), validateRequest(schema.createTemplateSchema), controller.createTemplate);
router.get('/', authorize('reports:read'), validateRequest(schema.listTemplatesSchema), controller.listTemplates);
router.get('/:templateId', authorize('reports:read'), validateRequest(schema.getTemplateSchema), controller.getTemplate);
router.put('/:templateId', authorize('reports:update'), validateRequest(schema.updateTemplateSchema), controller.updateTemplate);
router.delete('/:templateId', authorize('reports:delete'), validateRequest(schema.deleteTemplateSchema), controller.deleteTemplate);
router.post('/:templateId/clone', authorize('reports:create'), validateRequest(schema.cloneTemplateSchema), controller.cloneTemplate);

export default router;
