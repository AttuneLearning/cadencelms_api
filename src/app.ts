import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/environment';
import { stream } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Phase 1 routes
import authRoutes from './routes/auth.routes';
import rolesRoutes from './routes/roles.routes';
import permissionsRoutes from './routes/permissions.routes';
import accessRightsRoutes from './routes/access-rights.routes';
import usersRoutes from './routes/users.routes';
import staffRoutes from './routes/staff.routes';
import learnersRoutes from './routes/learners.routes';
import departmentsRoutes from './routes/departments.routes';
import academicYearsRoutes from './routes/academic-years.routes';
import lookupValuesRoutes from './routes/lookup-values.routes';
import listsRoutes from './routes/lists.routes';

// Phase 2 routes
import programsRoutes from './routes/programs.routes';
import coursesRoutes from './routes/courses.routes';
// courseSegmentsRoutes removed - replaced by modulesRoutes
import modulesRoutes from './routes/v2/modules.routes';
import { courseVersionsRouter, versionRouter } from './routes/v2/courseVersion.routes';
import learningUnitsRoutes from './routes/v2/learning-units.routes';
import learningUnitQuestionsRoutes from './routes/v2/learning-unit-questions.routes';
import assessmentsRoutes from './routes/v2/assessments.routes';
import assessmentAttemptsRoutes from './routes/v2/assessment-attempts.routes';
import aiQuizRoutes from './routes/v2/ai-quiz.routes';
import learnerQuestionProgressRoutes from './routes/v2/learner-question-progress.routes';
import moduleEditLockRoutes from './routes/v2/module-edit-lock.routes';
import classesRoutes from './routes/classes.routes';

// Phase 3 routes
import contentRoutes from './routes/content.routes';
import mediaRoutes from './routes/media.routes';
import exercisesRoutes from './routes/exercises.routes';
import matchingExerciseRoutes from './routes/matching-exercise.routes';
import questionsRoutes from './routes/questions.routes';
import templatesRoutes from './routes/templates.routes';
import certificateTemplatesRoutes from './routes/certificate-templates.routes';
import departmentQuestionBanksRoutes from './routes/department-question-banks.routes';
import departmentQuestionsRoutes from './routes/department-questions.routes';

// Phase 4 routes
import enrollmentsRoutes from './routes/enrollments.routes';
import gradeOverrideRoutes from './routes/grade-override.routes';
import progressRoutes from './routes/progress.routes';
import contentAttemptsRoutes from './routes/content-attempts.routes';
import learningEventsRoutes from './routes/learning-events.routes';

// Phase 5 routes
import examAttemptsRoutes from './routes/exam-attempts.routes';
import reportsRoutes from './routes/reports.routes';

// Phase 6 routes
import settingsRoutes from './routes/settings.routes';
import auditLogsRoutes from './routes/audit-logs.routes';
import systemRoutes from './routes/system.routes';

// Phase 7 routes - Analytics
import analyticsRoutes from './routes/analytics.routes';

// Admin routes (system-admin only)
import adminRoutes from './routes/admin.routes';

// Additional routes
import programLevelsRoutes from './routes/program-levels.routes';

// Adaptive Learning routes (Knowledge Node System)
import cognitiveDepthLevelsRoutes from './routes/cognitive-depth-levels.routes';
import courseCognitiveDepthLevelsRoutes from './routes/course-cognitive-depth-levels.routes';
import departmentAdaptiveSettingsRoutes from './routes/department-adaptive-settings.routes';
import knowledgeNodesRoutes from './routes/knowledge-nodes.routes';
import learnerKnowledgeProgressRoutes from './routes/learner-knowledge-progress.routes';
import adaptiveSelectionRoutes from './routes/adaptive-selection.routes';

// Flashcard System routes
import flashcardRoutes from './routes/flashcard.routes';
import retentionCheckRoutes from './routes/retention-check.routes';

// Credential & Certificate Definition routes
import { credentialGroupRouter, certificateDefinitionRouter } from './routes/v2/credential.routes';

// Access Policy routes
import accessExtensionRequestsRoutes from './routes/access-policy.routes';

// Certificate Issuance routes
import {
  certificateIssuanceRouter,
  certificateVerificationRouter,
  learnerCertificateRouter
} from './routes/v2/certificateIssuance.routes';

// Module Completion & Sharing routes
import {
  moduleCompletionsRouter,
  learnerModuleCompletionsRouter,
  moduleUsageRouter,
  departmentModulesRouter
} from './routes/v2/module-completion.routes';

// Learner Exception routes
import { enrollmentExceptionRouter, exceptionRouter } from './routes/v2/learnerException.routes';

// Notification routes
import notificationRouter from './routes/v2/notification.routes';

// Discussion Forum routes
import { courseDiscussionRouter, threadRouter, replyRouter } from './routes/v2/discussion.routes';

// Assignment Submission routes
import { assignmentRouter, submissionRouter } from './routes/v2/assignment.routes';

// Calendar Feed routes
import calendarFeedsRoutes from './routes/v2/calendar-feeds.routes';

// Playlist Session routes
import playlistSessionRoutes from './routes/v2/playlist-session.routes';

// Module Access routes
import moduleAccessRoutes from './routes/v2/module-access.routes';

// Message/Inbox routes
import messageRoutes from './routes/v2/message.routes';

// Event handlers
import { registerNotificationHandlers } from './events/handlers/notification.handlers';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (config.env !== 'test') {
  app.use(morgan('combined', { stream }));
}

// Test routes (only in test environment)
if (config.env === 'test') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const testRoutes = require('./routes/test.routes').default;
  app.use('/api/v2', testRoutes);
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// API routes - Phase 1
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/roles', rolesRoutes);
app.use('/api/v2/permissions', permissionsRoutes);
app.use('/api/v2/access-rights', accessRightsRoutes);
app.use('/api/v2/users', usersRoutes);
app.use('/api/v2/users/staff', staffRoutes);
app.use('/api/v2/users/learners', learnersRoutes);
app.use('/api/v2/departments', departmentsRoutes);
app.use('/api/v2/calendar', academicYearsRoutes);
app.use('/api/v2/calendar', calendarFeedsRoutes); // Calendar feed endpoints (learner, staff, system)
app.use('/api/v2/lookup-values', lookupValuesRoutes);
app.use('/api/v2/lists', listsRoutes);

// API routes - Phase 2
app.use('/api/v2/programs', programsRoutes);
app.use('/api/v2/courses', coursesRoutes); // Main courses routes
app.use('/api/v2/courses', modulesRoutes); // New modules routes with completionCriteria/presentationRules
app.use('/api/v2/courses/:id/versions', courseVersionsRouter); // Course versioning - create/list versions
app.use('/api/v2/course-versions', versionRouter); // Course versioning - get/update/publish/lock versions
// Note: courseSegmentsRoutes replaced by modulesRoutes for /courses/:courseId/modules endpoints
app.use('/api/v2/modules/:moduleId/learning-units', learningUnitsRoutes); // Learning units nested under modules
app.use('/api/v2/learning-units/:learningUnitId/questions', learningUnitQuestionsRoutes); // Question linking for learning units
app.use('/api/v2/assessments', assessmentsRoutes); // Assessments CRUD/publish/archive
app.use('/api/v2/assessments/:assessmentId/attempts', assessmentAttemptsRoutes); // Assessment attempts
app.use('/api/v2/learning-units/:learningUnitId/ai-quiz', aiQuizRoutes); // AI Quiz shell endpoints (501)
app.use('/api/v2/learning-units/:learningUnitId/progress/:learnerId/questions', learnerQuestionProgressRoutes); // Learner question progress tracking
app.use('/api/v2/modules', moduleEditLockRoutes); // Module edit locking for concurrent edit prevention
app.use('/api/v2/classes', classesRoutes);

// API routes - Phase 3
app.use('/api/v2/content', contentRoutes);
app.use('/api/v2/media', mediaRoutes); // Media upload with presigned URLs (S3/local)
app.use('/api/v2/content/exercises', matchingExerciseRoutes); // Matching exercise routes (before general exercises)
app.use('/api/v2/content/exercises', exercisesRoutes);
app.use('/api/v2/questions', questionsRoutes);
app.use('/api/v2/templates', templatesRoutes);
app.use('/api/v2/certificate-templates', certificateTemplatesRoutes);
app.use('/api/v2/departments/:departmentId/question-banks', departmentQuestionBanksRoutes); // Question banks nested under departments
app.use('/api/v2/departments/:departmentId/questions', departmentQuestionsRoutes); // Department-scoped questions

// API routes - Phase 4
app.use('/api/v2/enrollments', enrollmentsRoutes);
app.use('/api/v2/enrollments', gradeOverrideRoutes); // Grade override endpoints nested under enrollments
app.use('/api/v2/enrollments/:enrollmentId/playlist-session', playlistSessionRoutes); // Playlist session persistence
app.use('/api/v2/progress', progressRoutes);
app.use('/api/v2/content-attempts', contentAttemptsRoutes);
app.use('/api/v2/learning-events', learningEventsRoutes);

// API routes - Phase 5
app.use('/api/v2/exam-attempts', examAttemptsRoutes);
app.use('/api/v2/reports', reportsRoutes);

// API routes - Phase 6
app.use('/api/v2/settings', settingsRoutes);
app.use('/api/v2/audit-logs', auditLogsRoutes);
app.use('/api/v2/system', systemRoutes);

// API routes - Phase 7 (Analytics)
app.use('/api/v2/analytics', analyticsRoutes);

// API routes - Admin (system-admin only, requires escalation)
app.use('/api/v2/admin', adminRoutes);

// API routes - Additional
app.use('/api/v2/program-levels', programLevelsRoutes);

// API routes - Adaptive Learning (Knowledge Node System)
app.use('/api/v2', cognitiveDepthLevelsRoutes); // Cognitive depth levels (system and department-specific)
app.use('/api/v2/courses/:courseId/cognitive-depth-levels', courseCognitiveDepthLevelsRoutes); // Course-level depth overrides
app.use('/api/v2/departments/:departmentId/adaptive-settings', departmentAdaptiveSettingsRoutes); // Department adaptive settings
app.use('/api/v2/departments/:departmentId/knowledge-nodes', knowledgeNodesRoutes); // Knowledge nodes nested under departments
app.use('/api/v2', learnerKnowledgeProgressRoutes); // Learner knowledge progress (multiple base paths)
app.use('/api/v2/adaptive', adaptiveSelectionRoutes); // Adaptive question selection

// API routes - Flashcard System (Spaced Repetition)
app.use('/api/v2/courses/:courseId', flashcardRoutes); // Flashcard endpoints nested under courses
app.use('/api/v2/courses/:courseId', retentionCheckRoutes); // Retention check and remediation endpoints

// API routes - Credential & Certificate Definitions
app.use('/api/v2/credential-groups', credentialGroupRouter); // Credential groups (named credentials)
app.use('/api/v2/certificate-definitions', certificateDefinitionRouter); // Versioned certificate definitions

// API routes - Certificate Issuance & Verification
app.use('/api/v2/certificate-issuances', certificateIssuanceRouter); // Certificate issuance management
app.use('/api/v2/certificates', certificateVerificationRouter); // Public verification (no auth)
app.use('/api/v2/learners/:id', learnerCertificateRouter); // Learner certificates and upgrade eligibility

// API routes - Module Completion & Sharing
app.use('/api/v2/module-completions', moduleCompletionsRouter); // Global module completion tracking
app.use('/api/v2/learners/:id/module-completions', learnerModuleCompletionsRouter); // Learner module completions
app.use('/api/v2/modules', moduleUsageRouter); // Module usage and completion stats
app.use('/api/v2/departments/:id/modules', departmentModulesRouter); // Department-owned and available modules
app.use('/api/v2/module-access', moduleAccessRoutes); // Module access tracking and analytics

// API routes - Learner Exceptions
app.use('/api/v2/enrollments', enrollmentExceptionRouter); // Enrollment-scoped exception operations
app.use('/api/v2/exceptions', exceptionRouter); // Exception-level operations (get, revoke)

// API routes - Access Policy & Extension Requests
app.use('/api/v2/access-extension-requests', accessExtensionRequestsRoutes); // Access extension request management

// API routes - Notifications
app.use('/api/v2/users/me', notificationRouter); // User notification management

// API routes - Discussion Forums
app.use('/api/v2/courses/:courseId/discussions', courseDiscussionRouter); // Course-scoped discussion threads
app.use('/api/v2/discussions', threadRouter); // Thread-level operations
app.use('/api/v2/replies', replyRouter); // Reply-level operations

// API routes - Assignment Submissions
app.use('/api/v2/assignments', assignmentRouter); // Assignment CRUD + nested submissions
app.use('/api/v2/submissions', submissionRouter); // Submission-level operations

// API routes - Messages/Inbox
app.use('/api/v2/messages', messageRoutes); // User message inbox and management

// Register event handlers
registerNotificationHandlers();

// 404 handler
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;
