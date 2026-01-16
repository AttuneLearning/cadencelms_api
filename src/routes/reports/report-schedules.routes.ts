import { Router } from 'express';
import * as controller from '@/controllers/reports/report-schedules.controller';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { validateRequest } from '@/middlewares/validateRequest';
import * as schema from '@contracts/api/report-schedules.contract';

const router = Router();
router.use(authenticate);

router.post('/', authorize('reports:create'), validateRequest(schema.createScheduleSchema), controller.createSchedule);
router.get('/', authorize('reports:read'), validateRequest(schema.listSchedulesSchema), controller.listSchedules);
router.get('/:scheduleId', authorize('reports:read'), validateRequest(schema.getScheduleSchema), controller.getSchedule);
router.put('/:scheduleId', authorize('reports:update'), validateRequest(schema.updateScheduleSchema), controller.updateSchedule);
router.post('/:scheduleId/pause', authorize('reports:update'), validateRequest(schema.pauseScheduleSchema), controller.pauseSchedule);
router.post('/:scheduleId/resume', authorize('reports:update'), validateRequest(schema.resumeScheduleSchema), controller.resumeSchedule);

export default router;
