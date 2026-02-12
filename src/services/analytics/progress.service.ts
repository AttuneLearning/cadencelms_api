import mongoose from 'mongoose';
import Enrollment from '@/models/enrollment/Enrollment.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import ScormAttempt from '@/models/activity/ScormAttempt.model';
import ExamResult from '@/models/activity/ExamResult.model';
import Program from '@/models/academic/Program.model';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import Module from '@/models/academic/Module.model';
import Class from '@/models/academic/Class.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import { Learner } from '@/models/auth/Learner.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';
import { maskLastName } from '@/utils/dataMasking';
import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';

/**
 * Helper: Resolve a courseId to a course-like object with name, code, _id, and credits.
 * Checks Course (legacy) first, then CanonicalCourse + CourseVersion.
 */
async function resolveCourse(courseId: string): Promise<{
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  credits: number;
  departmentId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId | null;
  isActive: boolean;
  courseVersionId: mongoose.Types.ObjectId;
} | null> {
  const canonical = await CanonicalCourse.findById(courseId);
  if (canonical) {
    let name = canonical.code; // Default to code if no version found
    let credits = 0;

    // Get name from published version, or latest draft
    const selectedVersionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
    const version = selectedVersionId
      ? await CourseVersion.findById(selectedVersionId)
      : await CourseVersion.findOne({ canonicalCourseId: canonical._id, status: 'published' }).sort({ version: -1 });

    if (version) {
      name = version.title || canonical.code;
      credits = version.credits || 0;

      return {
        _id: canonical._id as mongoose.Types.ObjectId,
        name,
        code: canonical.code,
        credits,
        departmentId: canonical.departmentId,
        programId: canonical.programId,
        isActive: true,
        courseVersionId: version._id as mongoose.Types.ObjectId
      };
    }
  }

  return null;
}

interface CourseModuleProgressContext {
  moduleId: string;
  moduleTitle: string;
  moduleType: string;
  order: number;
  learningUnitIds: string[];
  contentIds: string[];
  passingScore: number | null;
  isRequired: boolean;
}

interface CourseLearningContext {
  course: {
    _id: mongoose.Types.ObjectId;
    name: string;
    code: string;
    credits: number;
    departmentId: mongoose.Types.ObjectId;
    programId: mongoose.Types.ObjectId | null;
    courseVersionId: mongoose.Types.ObjectId;
  };
  modules: CourseModuleProgressContext[];
  contentIds: string[];
}

async function buildCourseLearningContext(courseId: string): Promise<CourseLearningContext | null> {
  const course = await resolveCourse(courseId);
  if (!course) {
    return null;
  }

  const versionModules = (await CourseVersionModule.find({
    courseVersionId: course.courseVersionId
  })
    .select('moduleId order isRequired')
    .sort({ order: 1 })
    .lean()) as Array<{
    moduleId: mongoose.Types.ObjectId;
    order: number;
    isRequired: boolean;
  }>;

  const moduleIds = versionModules.map((item) => item.moduleId);
  const modules = moduleIds.length > 0
    ? ((await Module.find({ _id: { $in: moduleIds } })
        .select('_id title')
        .lean()) as Array<{ _id: mongoose.Types.ObjectId; title: string }>)
    : [];
  const moduleTitleMap = new Map(modules.map((module) => [module._id.toString(), module.title]));

  const learningUnits = moduleIds.length > 0
    ? ((await LearningUnit.find({
        moduleId: { $in: moduleIds },
        isActive: true
      })
        .select('_id moduleId contentId sequence title type settings')
        .sort({ sequence: 1 })
        .lean()) as Array<{
        _id: mongoose.Types.ObjectId;
        moduleId: mongoose.Types.ObjectId;
        contentId?: mongoose.Types.ObjectId;
        sequence: number;
        title: string;
        type: string;
        settings?: { passingScore?: number };
      }>)
    : [];

  const unitMap = new Map<string, typeof learningUnits>();
  for (const unit of learningUnits) {
    const key = unit.moduleId.toString();
    if (!unitMap.has(key)) {
      unitMap.set(key, []);
    }
    unitMap.get(key)!.push(unit);
  }

  const seenContentIds = new Set<string>();
  const moduleContexts: CourseModuleProgressContext[] = versionModules.map((versionModule) => {
    const moduleKey = versionModule.moduleId.toString();
    const moduleUnits = unitMap.get(moduleKey) || [];

    const contentIds = moduleUnits
      .map((unit) => unit.contentId?.toString() || '')
      .filter(Boolean)
      .filter((contentId, index, all) => all.indexOf(contentId) === index);

    contentIds.forEach((contentId) => seenContentIds.add(contentId));

    const fallbackTitle = moduleUnits[0]?.title || `Module ${versionModule.order}`;

    return {
      moduleId: moduleKey,
      moduleTitle: moduleTitleMap.get(moduleKey) || fallbackTitle,
      moduleType: moduleUnits[0]?.type || 'custom',
      order: versionModule.order,
      learningUnitIds: moduleUnits.map((unit) => unit._id.toString()),
      contentIds,
      passingScore: moduleUnits.find((unit) => unit.settings?.passingScore !== undefined)?.settings?.passingScore || null,
      isRequired: versionModule.isRequired
    };
  });

  return {
    course: {
      _id: course._id,
      name: course.name,
      code: course.code,
      credits: course.credits,
      departmentId: course.departmentId,
      programId: course.programId,
      courseVersionId: course.courseVersionId
    },
    modules: moduleContexts,
    contentIds: Array.from(seenContentIds)
  };
}

function filterAttemptsByContentIds<T extends { contentId?: mongoose.Types.ObjectId | string; examId?: mongoose.Types.ObjectId | string }>(
  items: T[],
  contentIds: string[]
): T[] {
  const allowed = new Set(contentIds);
  return items.filter((item) => {
    const id = (item.contentId || item.examId)?.toString();
    return !!id && allowed.has(id);
  });
}

function countCompletedContentItems(attempts: Array<{ contentId: mongoose.Types.ObjectId; status: string }>): number {
  const completed = new Set<string>();
  for (const attempt of attempts) {
    if (['completed', 'passed'].includes(attempt.status)) {
      completed.add(attempt.contentId.toString());
    }
  }
  return completed.size;
}

/**
 * Progress Tracking Service
 * Implements all progress tracking logic for programs, courses, classes, and learners
 */

interface ProgramProgressParams {
  programId: string;
  learnerId: string;
}

interface CourseProgressParams {
  courseId: string;
  learnerId: string;
}

interface ClassProgressParams {
  classId: string;
  learnerId: string;
}

interface ProgressSummaryFilters {
  programId?: string;
  courseId?: string;
  classId?: string;
  departmentId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minProgress?: number;
  maxProgress?: number;
  page?: number;
  limit?: number;
}

interface DetailedReportFilters {
  programId?: string;
  courseId?: string;
  classId?: string;
  departmentId?: string;
  learnerIds?: string[];
  includeModules?: boolean;
  includeAssessments?: boolean;
  includeAttendance?: boolean;
}

export class ProgressService {
  /**
   * Get Program Progress for a learner
   */
  static async getProgramProgress(params: ProgramProgressParams): Promise<any> {
    const { programId, learnerId } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get program
    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Get enrollment
    const enrollment = await Enrollment.findOne({
      learnerId,
      programId,
      status: { $in: ['active', 'completed'] }
    });
    if (!enrollment) {
      throw ApiError.notFound('Learner not enrolled in this program');
    }

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Get all canonical courses in program
    const programCourses = await CanonicalCourse.find({ programId }).select('_id');
    const programCourseContexts = await Promise.all(
      programCourses.map((course) => buildCourseLearningContext(course._id.toString()))
    );
    const validProgramCourseContexts = programCourseContexts.filter(
      (context): context is CourseLearningContext => context !== null
    );

    // Get course enrollments for this learner (via classes)
    const courseProgress = [];
    let totalCreditsEarned = 0;
    let totalCreditsRequired = 0;
    let coursesCompleted = 0;
    let totalTimeSpent = 0;
    let lastActivityAt: Date | null = null;

    for (const context of validProgramCourseContexts) {
      totalCreditsRequired += context.course.credits || 0;

      // Find class enrollments for this course
      const classes = await Class.find({ courseId: context.course._id });
      const classIds = classes.map(c => c._id);

      const classEnrollment = await ClassEnrollment.findOne({
        learnerId,
        classId: { $in: classIds },
        status: { $in: ['enrolled', 'active', 'completed'] }
      });

      if (classEnrollment) {
        const contentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));

        // Get all attempts for this course
        const scormAttempts = contentIds.length > 0 ? await ScormAttempt.find({
          learnerId,
          contentId: { $in: contentIds }
        }) : [];

        const examResults = contentIds.length > 0 ? await ExamResult.find({
          learnerId,
          examId: { $in: contentIds }
        }) : [];

        // Calculate progress
        const totalModules = context.modules.length;
        const completedModules = context.modules.filter((moduleContext) => {
          const attempts = filterAttemptsByContentIds(scormAttempts, moduleContext.contentIds);
          if (moduleContext.contentIds.length === 0) {
            return false;
          }
          const completedItems = countCompletedContentItems(
            attempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
          );
          return completedItems >= moduleContext.contentIds.length;
        }).length;

        const completionPercent = totalModules > 0
          ? Math.round((completedModules / totalModules) * 100)
          : 0;

        // Calculate time spent
        const courseTimeSpent = scormAttempts.reduce((sum, attempt) =>
          sum + (attempt.totalTime || 0), 0
        );
        totalTimeSpent += courseTimeSpent;

        // Calculate score
        const gradedExams = examResults.filter(e => e.status === 'graded' && e.percentage !== undefined);
        const avgScore = gradedExams.length > 0
          ? gradedExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedExams.length
          : null;

        // Determine status
        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (completionPercent === 100) {
          status = 'completed';
          totalCreditsEarned += context.course.credits || 0;
          coursesCompleted++;
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        // Find last activity
        const lastScormAccess = scormAttempts.reduce((latest, attempt) => {
          const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
          return (!latest || attemptDate > latest) ? attemptDate : latest;
        }, null as Date | null);

        const lastExamAccess = examResults.reduce((latest, result) => {
          const resultDate = result.submittedAt || result.updatedAt;
          return (!latest || resultDate > latest) ? resultDate : latest;
        }, null as Date | null);

        const courseLastAccess = [lastScormAccess, lastExamAccess]
          .filter(Boolean)
          .reduce((latest, date) =>
            (!latest || date! > latest) ? date! : latest, null as Date | null
          );

        if (courseLastAccess && (!lastActivityAt || courseLastAccess > lastActivityAt)) {
          lastActivityAt = courseLastAccess;
        }

        courseProgress.push({
          courseId: context.course._id.toString(),
          courseTitle: context.course.name,
          courseCode: context.course.code,
          levelId: null, // Would need ProgramLevel model
          levelNumber: 0,
          status,
          completionPercent,
          score: avgScore ? Math.round(avgScore) : null,
          creditsEarned: status === 'completed' ? (context.course.credits || 0) : 0,
          timeSpent: courseTimeSpent,
          enrolledAt: classEnrollment.enrollmentDate,
          startedAt: scormAttempts.length > 0 ? scormAttempts[0].startedAt : null,
          completedAt: status === 'completed' ? classEnrollment.completionDate : null,
          lastAccessedAt: courseLastAccess
        });
      }
    }

    // Calculate overall progress
    const overallCompletionPercent = validProgramCourseContexts.length > 0
      ? Math.round((coursesCompleted / validProgramCourseContexts.length) * 100)
      : 0;

    // Determine enrollment status
    let enrollmentStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (overallCompletionPercent === 100) {
      enrollmentStatus = 'completed';
    } else if (overallCompletionPercent > 0) {
      enrollmentStatus = 'in_progress';
    }

    // Calculate estimated completion date (simple projection)
    let estimatedCompletionDate: Date | null = null;
    if (enrollmentStatus === 'in_progress' && lastActivityAt) {
      const daysSinceStart = Math.floor(
        (new Date().getTime() - enrollment.enrollmentDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const coursesRemaining = validProgramCourseContexts.length - coursesCompleted;
      if (daysSinceStart > 0 && coursesCompleted > 0) {
        const daysPerCourse = daysSinceStart / coursesCompleted;
        const estimatedDaysRemaining = daysPerCourse * coursesRemaining;
        estimatedCompletionDate = new Date(Date.now() + estimatedDaysRemaining * 24 * 60 * 60 * 1000);
      }
    }

    // Generate milestones
    const milestones = [
      {
        id: 'halfway_point',
        name: 'Halfway There',
        description: 'Complete 50% of program',
        achieved: overallCompletionPercent >= 50,
        achievedAt: overallCompletionPercent >= 50 ? lastActivityAt : null,
        progress: Math.min(overallCompletionPercent * 2, 100)
      },
      {
        id: 'full_completion',
        name: 'Program Completion',
        description: 'Complete all program courses',
        achieved: overallCompletionPercent === 100,
        achievedAt: overallCompletionPercent === 100 ? enrollment.completionDate : null,
        progress: overallCompletionPercent
      }
    ];

    return {
      programId: program._id.toString(),
      programName: program.name,
      programCode: program.code,
      learnerId: learner._id.toString(),
      learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
      enrolledAt: enrollment.enrollmentDate,
      status: enrollmentStatus,
      overallProgress: {
        completionPercent: overallCompletionPercent,
        creditsEarned: totalCreditsEarned,
        creditsRequired: totalCreditsRequired,
        coursesCompleted,
        coursesTotal: validProgramCourseContexts.length,
        timeSpent: totalTimeSpent,
        lastActivityAt,
        estimatedCompletionDate
      },
      levelProgress: [], // Would need ProgramLevel implementation
      courseProgress,
      milestones
    };
  }

  /**
   * Get Course Progress for a learner
   */
  static async getCourseProgress(params: CourseProgressParams): Promise<any> {
    const { courseId, learnerId } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const context = await buildCourseLearningContext(courseId);
    if (!context) {
      throw ApiError.notFound('Course not found');
    }
    const course = context.course;

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Find enrollment — try ClassEnrollment (via Class) first, then Enrollment
    const classes = await Class.find({ courseId });
    const classIds = classes.map(c => c._id);

    let enrollmentDate: Date | null = null;
    let completionDate: Date | null = null;

    const classEnrollment = classIds.length > 0 ? await ClassEnrollment.findOne({
      learnerId,
      classId: { $in: classIds },
      status: { $in: ['enrolled', 'active', 'completed'] }
    }) : null;

    if (classEnrollment) {
      enrollmentDate = classEnrollment.enrollmentDate;
      completionDate = classEnrollment.completionDate || null;
    } else {
      // Fall back to Enrollment model (used by new enrollment system)
      const enrollment = await Enrollment.findOne({
        learnerId,
        targetId: new mongoose.Types.ObjectId(courseId),
        type: 'course',
        status: { $in: ['active', 'completed'] }
      });
      if (!enrollment) {
        throw ApiError.notFound('Learner not enrolled in this course');
      }
      enrollmentDate = enrollment.enrollmentDate;
      completionDate = enrollment.completionDate || null;
    }

    const contentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));

    // Get all attempts
    const scormAttempts = contentIds.length > 0 ? await ScormAttempt.find({
      learnerId,
      contentId: { $in: contentIds }
    }).sort({ createdAt: 1 }) : [];

    const examResults = contentIds.length > 0 ? await ExamResult.find({
      learnerId,
      examId: { $in: contentIds }
    }).sort({ createdAt: 1 }) : [];

    // Build module progress
    const moduleProgress = context.modules.map((moduleContext) => {
      const attempts = filterAttemptsByContentIds(scormAttempts, moduleContext.contentIds);
      const moduleExamResults = filterAttemptsByContentIds(examResults, moduleContext.contentIds);

      const latestAttempt = attempts[attempts.length - 1];

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      let completionPercent = 0;
      let score: number | null = null;
      let timeSpent = 0;
      let bestAttemptScore: number | null = null;
      let lastAttemptScore: number | null = null;

      if (attempts.length > 0) {
        const completedItems = countCompletedContentItems(
          attempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
        );

        if (moduleContext.contentIds.length > 0 && completedItems >= moduleContext.contentIds.length) {
          status = 'completed';
          completionPercent = 100;
        } else if (latestAttempt.progressMeasure !== undefined) {
          status = 'in_progress';
          completionPercent = Math.round((latestAttempt.progressMeasure || 0) * 100);
        }

        timeSpent = attempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);

        const scores = attempts
          .filter(a => a.scoreScaled !== undefined)
          .map(a => (a.scoreScaled || 0) * 100);

        if (scores.length > 0) {
          bestAttemptScore = Math.round(Math.max(...scores));
          lastAttemptScore = Math.round(scores[scores.length - 1]);
          score = bestAttemptScore;
        }
      }

      if (score === null && moduleExamResults.length > 0) {
        const gradedResults = moduleExamResults.filter(
          (result) => result.status === 'graded' && result.percentage !== undefined
        );
        if (gradedResults.length > 0) {
          score = Math.round(
            gradedResults.reduce((sum, result) => sum + (result.percentage || 0), 0) /
              gradedResults.length
          );
        }
      }

      return {
        moduleId: moduleContext.moduleId,
        moduleTitle: moduleContext.moduleTitle,
        moduleType: moduleContext.moduleType,
        order: moduleContext.order,
        status,
        completionPercent,
        score,
        timeSpent,
        attempts: attempts.length,
        bestAttemptScore,
        lastAttemptScore,
        startedAt: attempts.length > 0 ? attempts[0].startedAt : null,
        completedAt: status === 'completed' ? latestAttempt?.completedAt : null,
        lastAccessedAt: latestAttempt?.lastAccessedAt || null,
        isRequired: moduleContext.isRequired,
        passingScore: moduleContext.passingScore,
        learningUnitIds: moduleContext.learningUnitIds,
        learningUnitCount: moduleContext.learningUnitIds.length,
        passed: score !== null && moduleContext.passingScore
          ? score >= moduleContext.passingScore
          : null
      };
    });

    // Calculate overall progress
    const completedModules = moduleProgress.filter(m => m.status === 'completed').length;
    const completionPercent = moduleProgress.length > 0
      ? Math.round((completedModules / moduleProgress.length) * 100)
      : 0;

    // Calculate overall score
    const scoredModules = moduleProgress.filter(m => m.score !== null);
    const avgScore = scoredModules.length > 0
      ? Math.round(scoredModules.reduce((sum, m) => sum + m.score!, 0) / scoredModules.length)
      : null;

    // Calculate time spent
    const totalTimeSpent = moduleProgress.reduce((sum, m) => sum + m.timeSpent, 0);

    // Find last accessed
    const lastAccessedAt = moduleProgress.reduce((latest, m) => {
      return (m.lastAccessedAt && (!latest || m.lastAccessedAt > latest))
        ? m.lastAccessedAt
        : latest;
    }, null as Date | null);

    // Calculate days active and streak
    const activityDates = scormAttempts
      .map(a => a.lastAccessedAt || a.updatedAt)
      .filter(Boolean)
      .map(d => d!.toISOString().split('T')[0])
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    const daysActive = activityDates.length;

    // Calculate streak (consecutive days)
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i <= 30; i++) {
      const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      if (activityDates.includes(checkDate)) {
        streak = i + 1;
      } else if (checkDate !== today) {
        break;
      }
    }

    // Build assessments
    const assessments = examResults.map(result => ({
      assessmentId: result.examId.toString(),
      title: result.metadata?.title || 'Assessment',
      type: result.metadata?.type || 'exam',
      status: result.status,
      score: result.percentage || null,
      maxScore: 100,
      passingScore: result.metadata?.passingScore || 70,
      passed: result.passed || null,
      attempts: result.attemptNumber,
      maxAttempts: result.metadata?.maxAttempts || null,
      lastAttemptAt: result.submittedAt || null,
      submittedAt: result.submittedAt || null,
      gradedAt: result.gradedAt || null
    }));

    // Build activity log (recent 10 events)
    const activityLog: any[] = [];

    scormAttempts.slice(-10).forEach(attempt => {
      if (attempt.startedAt) {
        activityLog.push({
          timestamp: attempt.startedAt,
          eventType: 'started',
          moduleId: attempt.contentId.toString(),
          moduleTitle: null,
          details: 'Module started'
        });
      }
      if (attempt.completedAt) {
        activityLog.push({
          timestamp: attempt.completedAt,
          eventType: 'completed',
          moduleId: attempt.contentId.toString(),
          moduleTitle: null,
          details: `Module completed`
        });
      }
    });

    activityLog.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const recentActivityLog = activityLog.slice(0, 10);

    // Determine overall status
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (completionPercent === 100) {
      status = 'completed';
    } else if (completionPercent > 0) {
      status = 'in_progress';
    }

    return {
      courseId: course._id.toString(),
      courseTitle: course.name,
      courseCode: course.code,
      learnerId: learner._id.toString(),
      learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
      enrolledAt: enrollmentDate,
      startedAt: scormAttempts.length > 0 ? scormAttempts[0].startedAt : null,
      completedAt: status === 'completed' ? completionDate : null,
      status,
      overallProgress: {
        completionPercent,
        modulesCompleted: completedModules,
        modulesTotal: moduleProgress.length,
        score: avgScore,
        timeSpent: totalTimeSpent,
        lastAccessedAt,
        daysActive,
        streak
      },
      moduleProgress,
      assessments,
      activityLog: recentActivityLog
    };
  }

  /**
   * Get Class Progress for a learner
   */
  static async getClassProgress(params: ClassProgressParams): Promise<any> {
    const { classId, learnerId } = params;

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw ApiError.badRequest('Invalid class ID');
    }
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw ApiError.notFound('Class not found');
    }

    const context = await buildCourseLearningContext(classDoc.courseId.toString());
    if (!context) {
      throw ApiError.notFound('Course not found');
    }
    const course = context.course;

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Get enrollment
    const enrollment = await ClassEnrollment.findOne({
      learnerId,
      classId
    });

    if (!enrollment) {
      throw ApiError.notFound('Learner not enrolled in this class');
    }

    // Get course progress (reuse canonical learning-unit logic)
    const contentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));

    const scormAttempts = contentIds.length > 0 ? await ScormAttempt.find({
      learnerId,
      contentId: { $in: contentIds }
    }) : [];

    const examResults = contentIds.length > 0 ? await ExamResult.find({
      learnerId,
      examId: { $in: contentIds }
    }) : [];

    // Calculate course progress
    const completedModules = context.modules.filter((moduleContext) => {
      const moduleAttempts = filterAttemptsByContentIds(scormAttempts, moduleContext.contentIds);
      if (moduleContext.contentIds.length === 0) {
        return false;
      }
      const completedItems = countCompletedContentItems(
        moduleAttempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
      );
      return completedItems >= moduleContext.contentIds.length;
    }).length;

    const completionPercent = context.modules.length > 0
      ? Math.round((completedModules / context.modules.length) * 100)
      : 0;

    const gradedExams = examResults.filter(e => e.status === 'graded' && e.percentage !== undefined);
    const avgScore = gradedExams.length > 0
      ? Math.round(gradedExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedExams.length)
      : null;

    const totalTimeSpent = scormAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);

    const lastAccessedAt = scormAttempts.reduce((latest, attempt) => {
      const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
      return (!latest || attemptDate > latest) ? attemptDate : latest;
    }, null as Date | null);

    // Calculate attendance
    const attendanceRecords = enrollment.attendanceRecords || [];
    const sessionsAttended = attendanceRecords.filter(r =>
      r.status === 'present' || r.status === 'late'
    ).length;
    const totalSessions = attendanceRecords.length;
    const attendanceRate = totalSessions > 0
      ? Math.round((sessionsAttended / totalSessions) * 100) / 100
      : 0;

    const sessions = attendanceRecords.map(record => ({
      sessionId: null,
      sessionDate: record.date,
      sessionTitle: `Session on ${record.date.toISOString().split('T')[0]}`,
      attended: ['present', 'late'].includes(record.status),
      markedAt: record.date,
      markedBy: null,
      notes: record.notes || null
    }));

    // Assignments (stored in metadata for now)
    const assignments = enrollment.metadata?.assignments || [];

    // Determine status
    let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (completionPercent === 100) {
      status = 'completed';
    } else if (completionPercent > 0) {
      status = 'in_progress';
    }

    return {
      classId: classDoc._id.toString(),
      className: classDoc.name,
      courseId: course._id.toString(),
      courseTitle: course.name,
      learnerId: learner._id.toString(),
      learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
      enrolledAt: enrollment.enrollmentDate,
      status,
      courseProgress: {
        completionPercent,
        modulesCompleted: completedModules,
        modulesTotal: context.modules.length,
        score: avgScore,
        timeSpent: totalTimeSpent,
        lastAccessedAt
      },
      attendance: {
        sessionsAttended,
        totalSessions,
        attendanceRate,
        sessions
      },
      assignments
    };
  }

  /**
   * Get Learner Overall Progress
   */
  static async getLearnerProgress(learnerId: string): Promise<any> {
    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    // Get learner info
    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Get all program enrollments
    const programEnrollments = await Enrollment.find({ learnerId });

    // Get all class enrollments
    const classEnrollments = await ClassEnrollment.find({ learnerId });

    // Get all unique course IDs
    const classes = await Class.find({
      _id: { $in: classEnrollments.map(e => e.classId) }
    });
//     const courseIdsSet = new Set(classes.map(c => c.courseId.toString()));

    // Get all attempts
    const allScormAttempts = await ScormAttempt.find({ learnerId });
    const allExamResults = await ExamResult.find({ learnerId });

    // Calculate summary
    const programsCompleted = programEnrollments.filter(e =>
      e.status === 'completed' || e.status === 'graduated'
    ).length;

    const coursesCompleted = classEnrollments.filter(e =>
      e.status === 'completed'
    ).length;

    const totalCreditsEarned = classEnrollments
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.creditsEarned || 0), 0);

    const totalTimeSpent = allScormAttempts.reduce((sum, a) =>
      sum + (a.totalTime || 0), 0
    );

    const gradedExams = allExamResults.filter(e =>
      e.status === 'graded' && e.percentage !== undefined
    );
    const averageScore = gradedExams.length > 0
      ? Math.round(gradedExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedExams.length)
      : 0;

    // Calculate streaks
    const activityDates = allScormAttempts
      .map(a => a.lastAccessedAt || a.updatedAt)
      .filter(Boolean)
      .map(d => d!.toISOString().split('T')[0])
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();

    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i <= 30; i++) {
      const checkDate = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      if (activityDates.includes(checkDate)) {
        currentStreak = i + 1;
      } else if (checkDate !== today) {
        break;
      }
    }

    let longestStreak = 0;
    let tempStreak = 0;
    for (let i = 1; i < activityDates.length; i++) {
      const prevDate = new Date(activityDates[i - 1]);
      const currDate = new Date(activityDates[i]);
      const daysDiff = Math.floor(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak + 1);
      } else {
        tempStreak = 0;
      }
    }

    const lastActivityAt = allScormAttempts.reduce((latest, attempt) => {
      const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
      return (!latest || attemptDate > latest) ? attemptDate : latest;
    }, null as Date | null);

    // Build program progress
    const programProgress = await Promise.all(
      programEnrollments.map(async (enrollment) => {
        const program = await Program.findById(enrollment.programId);
        if (!program) return null;

        // Get canonical courses for this program
        const programCourses = await CanonicalCourse.find({
          programId: enrollment.programId
        }).select('_id');

        const programClasses = await Class.find({
          courseId: { $in: programCourses.map(c => c._id) }
        });

        const programClassEnrollments = classEnrollments.filter(ce =>
          programClasses.some(pc => pc._id.toString() === ce.classId.toString())
        );

        const completedCourses = programClassEnrollments.filter(e =>
          e.status === 'completed'
        ).length;

        const completionPercent = programCourses.length > 0
          ? Math.round((completedCourses / programCourses.length) * 100)
          : 0;

        const creditsEarned = programClassEnrollments
          .filter(e => e.status === 'completed')
          .reduce((sum, e) => sum + (e.creditsEarned || 0), 0);

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed' || enrollment.status === 'graduated') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        return {
          programId: program._id.toString(),
          programName: program.name,
          programCode: program.code,
          status,
          completionPercent,
          creditsEarned,
          creditsRequired: program.requiredCredits || 0,
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          lastAccessedAt: null // Would need to calculate
        };
      })
    );

    // Build course progress
    const courseProgress = await Promise.all(
      classes.map(async (classDoc) => {
        const course = await resolveCourse(classDoc.courseId.toString());
        if (!course) return null;

        const enrollment = classEnrollments.find(e =>
          e.classId.toString() === classDoc._id.toString()
        );
        if (!enrollment) return null;

        const context = await buildCourseLearningContext(course._id.toString());
        if (!context) return null;
        const contentIds = context.contentIds;

        const courseAttempts = allScormAttempts.filter(a =>
          contentIds.some((id) => id === a.contentId.toString())
        );

        const completedModules = context.modules.filter((moduleContext) => {
          const attempts = filterAttemptsByContentIds(courseAttempts, moduleContext.contentIds);
          if (moduleContext.contentIds.length === 0) {
            return false;
          }
          const completedItems = countCompletedContentItems(
            attempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
          );
          return completedItems >= moduleContext.contentIds.length;
        }).length;

        const completionPercent = context.modules.length > 0
          ? Math.round((completedModules / context.modules.length) * 100)
          : 0;

        const courseExams = allExamResults.filter((examResult) =>
          contentIds.some((contentId) => contentId === examResult.examId.toString())
        );

        const gradedCourseExams = courseExams.filter(e =>
          e.status === 'graded' && e.percentage !== undefined
        );
        const courseScore = gradedCourseExams.length > 0
          ? Math.round(gradedCourseExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / gradedCourseExams.length)
          : null;

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        // Find program
        const program = course.programId
          ? await Program.findById(course.programId)
          : null;

        const lastCourseActivity = courseAttempts.reduce((latest, attempt) => {
          const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
          return (!latest || attemptDate > latest) ? attemptDate : latest;
        }, null as Date | null);

        return {
          courseId: course._id.toString(),
          courseTitle: course.name,
          courseCode: course.code,
          programId: program?._id.toString() || null,
          programName: program?.name || null,
          status,
          completionPercent,
          score: courseScore,
          creditsEarned: status === 'completed' ? (enrollment.creditsEarned || 0) : 0,
          enrolledAt: enrollment.enrollmentDate,
          completedAt: enrollment.completionDate || null,
          lastAccessedAt: lastCourseActivity
        };
      })
    );

    // Build recent activity
    const recentActivity = allScormAttempts
      .slice(-20)
      .map(attempt => ({
        timestamp: attempt.lastAccessedAt || attempt.updatedAt,
        activityType: 'module_completed' as const,
        resourceId: attempt.contentId.toString(),
        resourceType: 'module' as const,
        resourceTitle: 'Module',
        details: `Progress: ${Math.round((attempt.progressMeasure || 0) * 100)}%`
      }))
      .reverse();

    // Build achievements
    const achievements = [];
    if (coursesCompleted > 0) {
      achievements.push({
        id: 'first_course_complete',
        type: 'course_completion',
        title: 'First Course Complete',
        description: 'Complete your first course',
        earnedAt: classEnrollments.find(e => e.status === 'completed')?.completionDate || new Date(),
        badge: null
      });
    }
    if (currentStreak >= 7) {
      achievements.push({
        id: 'week_streak',
        type: 'streak',
        title: '7 Day Streak',
        description: 'Learn for 7 consecutive days',
        earnedAt: new Date(),
        badge: null
      });
    }

    return {
      learnerId: learner._id.toString(),
      learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
      learnerEmail: user.email,
      summary: {
        programsEnrolled: programEnrollments.length,
        programsCompleted,
        coursesEnrolled: classEnrollments.length,
        coursesCompleted,
        classesEnrolled: classEnrollments.length,
        totalCreditsEarned,
        totalTimeSpent,
        averageScore,
        currentStreak,
        longestStreak,
        lastActivityAt,
        joinedAt: user.createdAt
      },
      programProgress: programProgress.filter(Boolean),
      courseProgress: courseProgress.filter(Boolean),
      recentActivity,
      achievements
    };
  }

  /**
   * Get Progress Summary Report
   */
  static async getProgressSummary(filters: ProgressSummaryFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (filters.programId) {
      const courses = await CanonicalCourse.find({ programId: filters.programId }).select('_id');
      const courseIds = courses.map((course) => course._id);
      const classes = await Class.find({ courseId: { $in: courseIds } });
      query.classId = { $in: classes.map(c => c._id) };
    }

    if (filters.courseId) {
      const classes = await Class.find({ courseId: filters.courseId });
      query.classId = { $in: classes.map(c => c._id) };
    }

    if (filters.classId) {
      query.classId = filters.classId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.enrollmentDate = {};
      if (filters.startDate) query.enrollmentDate.$gte = filters.startDate;
      if (filters.endDate) query.enrollmentDate.$lte = filters.endDate;
    }

    // Get enrollments
    const [enrollments, _total] = await Promise.all([
      ClassEnrollment.find(query).skip(skip).limit(limit),
      ClassEnrollment.countDocuments(query)
    ]);

    // Build learner data
    const learners = await Promise.all(
      enrollments.map(async (enrollment) => {
        const learner = await Learner.findById(enrollment.learnerId);
        const user = await User.findById(enrollment.learnerId);
        if (!learner || !user) return null;

        // Get class and course
        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) return null;

        const context = await buildCourseLearningContext(classDoc.courseId.toString());
        if (!context) return null;

        const contentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));
        const attempts = contentIds.length > 0 ? await ScormAttempt.find({
          learnerId: enrollment.learnerId,
          contentId: { $in: contentIds }
        }) : [];

        const completedModules = context.modules.filter((moduleContext) => {
          const moduleAttempts = filterAttemptsByContentIds(attempts, moduleContext.contentIds);
          if (moduleContext.contentIds.length === 0) {
            return false;
          }
          const completedItems = countCompletedContentItems(
            moduleAttempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
          );
          return completedItems >= moduleContext.contentIds.length;
        }).length;

        const completionPercent = context.modules.length > 0
          ? Math.round((completedModules / context.modules.length) * 100)
          : 0;

        // Filter by progress if specified
        if (filters.minProgress !== undefined && completionPercent < filters.minProgress) {
          return null;
        }
        if (filters.maxProgress !== undefined && completionPercent > filters.maxProgress) {
          return null;
        }

        const timeSpent = attempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);
        const lastAccessedAt = attempts.reduce((latest, attempt) => {
          const attemptDate = attempt.lastAccessedAt || attempt.updatedAt;
          return (!latest || attemptDate > latest) ? attemptDate : latest;
        }, null as Date | null);

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        return {
          learnerId: learner._id.toString(),
          learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
          learnerEmail: user.email,
          enrolledAt: enrollment.enrollmentDate,
          status,
          completionPercent,
          score: enrollment.gradePercentage || null,
          timeSpent,
          lastAccessedAt,
          completedAt: enrollment.completionDate || null
        };
      })
    );

    const filteredLearners = learners.filter(Boolean);

    // Calculate summary
    const totalLearners = filteredLearners.length;
    const averageProgress = totalLearners > 0
      ? Math.round(filteredLearners.reduce((sum, l) => sum + l!.completionPercent, 0) / totalLearners)
      : 0;

    const learnersWithScores = filteredLearners.filter(l => l!.score !== null);
    const averageScore = learnersWithScores.length > 0
      ? Math.round(learnersWithScores.reduce((sum, l) => sum + l!.score!, 0) / learnersWithScores.length)
      : 0;

    const completedCount = filteredLearners.filter(l => l!.status === 'completed').length;
    const inProgressCount = filteredLearners.filter(l => l!.status === 'in_progress').length;
    const notStartedCount = filteredLearners.filter(l => l!.status === 'not_started').length;
    const totalTimeSpent = filteredLearners.reduce((sum, l) => sum + l!.timeSpent, 0);

    return {
      filters: {
        programId: filters.programId || null,
        courseId: filters.courseId || null,
        classId: filters.classId || null,
        departmentId: filters.departmentId || null,
        status: filters.status || null,
        dateRange: {
          start: filters.startDate || null,
          end: filters.endDate || null
        }
      },
      summary: {
        totalLearners,
        averageProgress,
        averageScore,
        completedCount,
        inProgressCount,
        notStartedCount,
        totalTimeSpent
      },
      learners: filteredLearners,
      pagination: {
        page,
        limit,
        total: totalLearners,
        totalPages: Math.ceil(totalLearners / limit),
        hasNext: page * limit < totalLearners,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get Detailed Progress Report
   */
  static async getDetailedProgressReport(filters: DetailedReportFilters): Promise<any> {
    // Build query for enrollments
    const query: any = {};

    if (filters.courseId) {
      const classes = await Class.find({ courseId: filters.courseId });
      query.classId = { $in: classes.map(c => c._id) };
    }

    if (filters.classId) {
      query.classId = filters.classId;
    }

    if (filters.learnerIds && filters.learnerIds.length > 0) {
      query.learnerId = { $in: filters.learnerIds };
    }

    // Get enrollments
    const enrollments = await ClassEnrollment.find(query);

    // Build detailed learner data
    const learnerDetails = await Promise.all(
      enrollments.map(async (enrollment) => {
        const learner = await Learner.findById(enrollment.learnerId);
        const user = await User.findById(enrollment.learnerId);
        if (!learner || !user) return null;

        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) return null;

        const context = await buildCourseLearningContext(classDoc.courseId.toString());
        if (!context) return null;
        const contentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));

        // Get attempts
        const attempts = contentIds.length > 0 ? await ScormAttempt.find({
          learnerId: enrollment.learnerId,
          contentId: { $in: contentIds }
        }) : [];

        const examResults = contentIds.length > 0 ? await ExamResult.find({
          learnerId: enrollment.learnerId,
          examId: { $in: contentIds }
        }) : [];

        // Calculate progress
        const completedModules = context.modules.filter((moduleContext) => {
          const moduleAttempts = filterAttemptsByContentIds(attempts, moduleContext.contentIds);
          if (moduleContext.contentIds.length === 0) {
            return false;
          }
          const completedItems = countCompletedContentItems(
            moduleAttempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
          );
          return completedItems >= moduleContext.contentIds.length;
        }).length;

        const completionPercent = context.modules.length > 0
          ? Math.round((completedModules / context.modules.length) * 100)
          : 0;

        const timeSpent = attempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);

        let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
        if (enrollment.status === 'completed') {
          status = 'completed';
        } else if (completionPercent > 0) {
          status = 'in_progress';
        }

        // Build module progress if requested
        const moduleProgress = filters.includeModules !== false
          ? context.modules.map((moduleContext) => {
              const contentAttempts = filterAttemptsByContentIds(attempts, moduleContext.contentIds);
              const latest = contentAttempts[contentAttempts.length - 1];

              let moduleStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
              let moduleCompletion = 0;

              if (latest) {
                const completedItems = countCompletedContentItems(
                  contentAttempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
                );

                if (moduleContext.contentIds.length > 0 && completedItems >= moduleContext.contentIds.length) {
                  moduleStatus = 'completed';
                  moduleCompletion = 100;
                } else if (latest.progressMeasure !== undefined) {
                  moduleStatus = 'in_progress';
                  moduleCompletion = Math.round((latest.progressMeasure || 0) * 100);
                }
              }

              return {
                moduleId: moduleContext.moduleId,
                moduleTitle: moduleContext.moduleTitle,
                moduleType: moduleContext.moduleType,
                order: moduleContext.order,
                status: moduleStatus,
                completionPercent: moduleCompletion,
                score: latest?.scoreScaled ? Math.round(latest.scoreScaled * 100) : null,
                timeSpent: contentAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0),
                attempts: contentAttempts.length,
                startedAt: contentAttempts.length > 0 ? contentAttempts[0].startedAt : null,
                completedAt: moduleStatus === 'completed' ? latest?.completedAt : null,
                lastAccessedAt: latest?.lastAccessedAt || null,
                learningUnitIds: moduleContext.learningUnitIds,
                learningUnitCount: moduleContext.learningUnitIds.length
              };
            })
          : [];

        // Build assessment results if requested
        const assessmentResults = filters.includeAssessments !== false
          ? examResults.map(result => ({
              assessmentId: result.examId.toString(),
              title: result.metadata?.title || 'Assessment',
              type: result.metadata?.type || 'exam',
              score: result.percentage || null,
              maxScore: 100,
              passed: result.passed || null,
              attempts: result.attemptNumber,
              submittedAt: result.submittedAt || null,
              gradedAt: result.gradedAt || null
            }))
          : [];

        // Build attendance if requested
        const attendance = filters.includeAttendance
          ? {
              sessionsAttended: (enrollment.attendanceRecords || []).filter(r =>
                ['present', 'late'].includes(r.status)
              ).length,
              totalSessions: (enrollment.attendanceRecords || []).length,
              attendanceRate: 0
            }
          : {
              sessionsAttended: 0,
              totalSessions: 0,
              attendanceRate: 0
            };

        if (attendance.totalSessions > 0) {
          attendance.attendanceRate = Math.round(
            (attendance.sessionsAttended / attendance.totalSessions) * 100
          ) / 100;
        }

        return {
          learnerId: learner._id.toString(),
          learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
          learnerEmail: user.email,
          studentId: null,
          department: {
            id: null,
            name: null
          },
          enrolledAt: enrollment.enrollmentDate,
          overallProgress: {
            completionPercent,
            score: enrollment.gradePercentage || null,
            timeSpent,
            status
          },
          moduleProgress,
          assessmentResults,
          attendance
        };
      })
    );

    const reportId = `RPT-${new Date().toISOString().split('T')[0]}-${Date.now()}`;

    return {
      reportId,
      generatedAt: new Date(),
      generatedBy: {
        id: null,
        name: 'System'
      },
      filters: {
        programId: filters.programId || null,
        courseId: filters.courseId || null,
        classId: filters.classId || null,
        departmentId: filters.departmentId || null,
        learnerIds: filters.learnerIds || []
      },
      learnerDetails: learnerDetails.filter(Boolean),
      downloadUrl: null
    };
  }

  /**
   * Apply instructor class scoping to progress queries
   *
   * Business Rule: Instructors can only see progress for their assigned classes
   */
  static async applyInstructorClassScoping(query: any, user: any): Promise<any> {
    // Check if user has instructor role in any department membership
    const isInstructor = user.departmentMemberships?.some((m: any) => m.roles?.includes('instructor'));
    if (!isInstructor) {
      return query;
    }

    // Get instructor's assigned class IDs
    const instructorClasses = await Class.find({
      'metadata.instructorId': user._id
    }).select('_id');

    const classIds = instructorClasses.map(c => c._id);

    // Add class filter to query
    if (query.classId) {
      // If query already has classId, intersect with instructor's classes
      query.classId = {
        $in: Array.isArray(query.classId.$in)
          ? query.classId.$in.filter((id: any) => classIds.some(cid => cid.toString() === id.toString()))
          : classIds
      };
    } else {
      query.classId = { $in: classIds };
    }

    return query;
  }

  /**
   * Apply department scoping to progress queries
   *
   * Business Rule: Department-admin can see only their department's progress
   */
  static async applyDepartmentScoping(query: any, user: any): Promise<any> {
    // Global admins see all (system-admin, enrollment-admin)
    if (user.userTypes?.includes('global-admin') || user.allAccessRights?.includes('system:*')) {
      return query;
    }

    // For department-admin, apply department filtering
    const isDepartmentAdmin = user.departmentMemberships?.some((m: any) => m.roles?.includes('department-admin'));
    if (isDepartmentAdmin) {
      const userDepartmentIds = user.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];

      if (userDepartmentIds.length === 0) {
        // No department membership - no data visible
        query._id = { $in: [] };
        return query;
      }

      // Expand department IDs to include subdepartments for top-level members
      const expandedDeptIds: string[] = [];
      for (const deptId of userDepartmentIds) {
        const deptHierarchy = await getDepartmentAndSubdepartments(deptId);
        expandedDeptIds.push(...deptHierarchy);
      }

      // Get courses in these departments
      const courses = await CanonicalCourse.find({
        departmentId: { $in: expandedDeptIds }
      }).select('_id');

      const courseIds = courses.map(c => c._id);

      // Get classes for these courses
      const classes = await Class.find({
        courseId: { $in: courseIds }
      }).select('_id');

      const classIds = classes.map(c => c._id);

      // Add class filter to query
      if (query.classId) {
        // Intersect with existing classId filter
        query.classId = {
          $in: Array.isArray(query.classId.$in)
            ? query.classId.$in.filter((id: any) => classIds.some(cid => cid.toString() === id.toString()))
            : classIds
        };
      } else {
        query.classId = { $in: classIds };
      }
    }

    return query;
  }

  /**
   * Apply combined authorization scoping
   *
   * Combines instructor and department scoping for progress queries
   */
  static async applyAuthorizationScoping(query: any, user: any): Promise<any> {
    // First apply instructor scoping (if instructor)
    query = await this.applyInstructorClassScoping(query, user);

    // Then apply department scoping (if department-admin)
    query = await this.applyDepartmentScoping(query, user);

    return query;
  }

  /**
   * Apply data masking to learner information
   *
   * Business Rule: Instructors and department-admin see "FirstName L." format
   */
  static applyDataMasking(learnerData: any, user: any): any {
    // Create a temporary user object for masking
    const learnerUser = {
      firstName: learnerData.learnerName?.split(' ')[0] || learnerData.firstName || '',
      lastName: learnerData.learnerName?.split(' ')[1] || learnerData.lastName || '',
      fullName: learnerData.learnerName || '',
      ...learnerData
    };

    const masked = maskLastName(learnerUser, user);

    return {
      ...learnerData,
      learnerName: masked.fullName || `${masked.firstName} ${masked.lastName}`
    };
  }

  /**
   * Apply data masking to a list of learner progress records
   */
  static applyDataMaskingToList(learners: any[], user: any): any[] {
    return learners.map(learner => this.applyDataMasking(learner, user));
  }
}
