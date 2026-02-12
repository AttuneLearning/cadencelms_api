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
import { Staff } from '@/models/auth/Staff.model';
import Department from '@/models/organization/Department.model';
import { ApiError } from '@/utils/ApiError';
import { maskLastName } from '@/utils/dataMasking';
import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';

/**
 * Reports Service
 * Implements comprehensive reporting and analytics for completion, performance, and transcripts
 */

interface CompletionReportFilters {
  programId?: string;
  courseId?: string;
  classId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  learnerId?: string;
  groupBy?: string;
  includeDetails?: boolean;
  page?: number;
  limit?: number;
}

interface PerformanceReportFilters {
  programId?: string;
  courseId?: string;
  classId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  learnerId?: string;
  minScore?: number;
  includeRankings?: boolean;
  page?: number;
  limit?: number;
}

interface CourseReportParams {
  courseId: string;
  classId?: string;
  startDate?: Date;
  endDate?: Date;
  includeModules?: boolean;
}

interface ProgramReportParams {
  programId: string;
  academicYearId?: string;
  startDate?: Date;
  endDate?: Date;
}

interface DepartmentReportParams {
  departmentId: string;
  startDate?: Date;
  endDate?: Date;
  includeSubDepartments?: boolean;
}

interface ExportReportFilters {
  reportType: string;
  format: string;
  programId?: string;
  courseId?: string;
  classId?: string;
  departmentId?: string;
  startDate?: Date;
  endDate?: Date;
  learnerId?: string;
  includeDetails?: boolean;
}

async function resolveCourse(courseId: string): Promise<{
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  credits: number;
  departmentId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId | null;
  courseVersionId: mongoose.Types.ObjectId;
  instructorIds: mongoose.Types.ObjectId[];
} | null> {
  const canonical = await CanonicalCourse.findById(courseId);
  if (!canonical) {
    return null;
  }

  let name = canonical.code;
  let credits = 0;
  let instructorIds: mongoose.Types.ObjectId[] = [];

  const selectedVersionId = canonical.currentPublishedVersionId || canonical.latestDraftVersionId;
  const version = selectedVersionId
    ? await CourseVersion.findById(selectedVersionId)
    : await CourseVersion.findOne({ canonicalCourseId: canonical._id, status: 'published' }).sort({ version: -1 });

  if (!version) {
    return null;
  }

  name = version.title || canonical.code;
  credits = version.credits || 0;
  instructorIds = version.instructorIds || [];

  return {
    _id: canonical._id as mongoose.Types.ObjectId,
    name,
    code: canonical.code,
    credits,
    departmentId: canonical.departmentId,
    programId: canonical.programId,
    courseVersionId: version._id as mongoose.Types.ObjectId,
    instructorIds
  };
}

interface CourseModuleReportContext {
  moduleId: string;
  moduleTitle: string;
  moduleType: string;
  order: number;
  learningUnitIds: string[];
  contentIds: string[];
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
    instructorIds: mongoose.Types.ObjectId[];
  };
  modules: CourseModuleReportContext[];
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
    .select('moduleId order')
    .sort({ order: 1 })
    .lean()) as Array<{ moduleId: mongoose.Types.ObjectId; order: number }>;

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
        .select('_id moduleId contentId sequence title type')
        .sort({ sequence: 1 })
        .lean()) as Array<{
        _id: mongoose.Types.ObjectId;
        moduleId: mongoose.Types.ObjectId;
        contentId?: mongoose.Types.ObjectId;
        sequence: number;
        title: string;
        type: string;
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
  const moduleContexts: CourseModuleReportContext[] = versionModules.map((versionModule) => {
    const moduleKey = versionModule.moduleId.toString();
    const moduleUnits = unitMap.get(moduleKey) || [];
    const contentIds = moduleUnits
      .map((unit) => unit.contentId?.toString() || '')
      .filter(Boolean)
      .filter((contentId, index, all) => all.indexOf(contentId) === index);

    contentIds.forEach((contentId) => seenContentIds.add(contentId));

    return {
      moduleId: moduleKey,
      moduleTitle: moduleTitleMap.get(moduleKey) || moduleUnits[0]?.title || `Module ${versionModule.order}`,
      moduleType: moduleUnits[0]?.type || 'custom',
      order: versionModule.order,
      learningUnitIds: moduleUnits.map((unit) => unit._id.toString()),
      contentIds
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
      courseVersionId: course.courseVersionId,
      instructorIds: course.instructorIds
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

export class ReportsService {
  /**
   * Get Completion Report
   */
  static async getCompletionReport(filters: CompletionReportFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 500);
    const skip = (page - 1) * limit;
    const groupBy = filters.groupBy || 'course';
    const includeDetails = filters.includeDetails || false;

    // Build query for enrollments
    const enrollmentQuery: any = {};

    if (filters.startDate || filters.endDate) {
      enrollmentQuery.enrollmentDate = {};
      if (filters.startDate) enrollmentQuery.enrollmentDate.$gte = filters.startDate;
      if (filters.endDate) enrollmentQuery.enrollmentDate.$lte = filters.endDate;
    }

    if (filters.status) {
      enrollmentQuery.status = filters.status;
    }

    if (filters.learnerId) {
      enrollmentQuery.learnerId = filters.learnerId;
    }

    // Filter by classId, courseId, or programId
    let classIds: mongoose.Types.ObjectId[] = [];

    if (filters.classId) {
      classIds = [new mongoose.Types.ObjectId(filters.classId)];
    } else if (filters.courseId) {
      const classes = await Class.find({ courseId: filters.courseId });
      classIds = classes.map(c => c._id);
    } else if (filters.programId) {
      const courses = await CanonicalCourse.find({ programId: filters.programId }).select('_id');
      const classes = await Class.find({ courseId: { $in: courses.map(c => c._id) } });
      classIds = classes.map(c => c._id);
    }

    if (classIds.length > 0) {
      enrollmentQuery.classId = { $in: classIds };
    }

    // Get all enrollments matching filters
    const allEnrollments = await ClassEnrollment.find(enrollmentQuery);

    // Calculate overall summary
    const totalEnrollments = allEnrollments.length;
    const notStarted = allEnrollments.filter(e => e.status === 'enrolled').length;
    const inProgress = allEnrollments.filter(e => ['enrolled', 'active'].includes(e.status)).length;
    const completed = allEnrollments.filter(e => e.status === 'completed').length;
    const withdrawn = allEnrollments.filter(e => e.status === 'withdrawn').length;
    const completionRate = totalEnrollments > 0 ? (completed / totalEnrollments) * 100 : 0;

    // Calculate average time to complete
    const completedEnrollments = allEnrollments.filter(e =>
      e.status === 'completed' && e.completionDate && e.enrollmentDate
    );
    const avgTimeToComplete = completedEnrollments.length > 0
      ? completedEnrollments.reduce((sum, e) => {
          const time = (e.completionDate!.getTime() - e.enrollmentDate.getTime()) / 1000;
          return sum + time;
        }, 0) / completedEnrollments.length
      : 0;

    // Group enrollments
    const groups: any[] = [];
    const groupMap = new Map<string, any[]>();

    for (const enrollment of allEnrollments) {
      let groupKey = '';

      if (groupBy === 'course') {
        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) continue;
        const context = await buildCourseLearningContext(classDoc.courseId.toString());
        if (!context) continue;
        groupKey = context.course._id.toString();
      } else if (groupBy === 'program') {
        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) continue;
        const context = await buildCourseLearningContext(classDoc.courseId.toString());
        if (!context || !context.course.programId) continue;
        const program = await Program.findById(context.course.programId);
        if (!program) continue;
        groupKey = program._id.toString();
      } else if (groupBy === 'status') {
        groupKey = enrollment.status;
      } else if (groupBy === 'month') {
        const month = enrollment.enrollmentDate.toISOString().slice(0, 7);
        groupKey = month;
      } else if (groupBy === 'department') {
        const learner = await Learner.findById(enrollment.learnerId);
        if (!learner || !(learner as any).departmentId) continue;
        const dept = await Department.findById((learner as any).departmentId);
        if (!dept) continue;
        groupKey = dept._id.toString();
      }

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, []);
      }
      groupMap.get(groupKey)!.push(enrollment);
    }

    // Process each group
    for (const [groupKey, enrollments] of groupMap.entries()) {
      const groupTotal = enrollments.length;
      const groupNotStarted = enrollments.filter(e => e.status === 'pending').length;
      const groupInProgress = enrollments.filter(e => ['enrolled', 'active'].includes(e.status)).length;
      const groupCompleted = enrollments.filter(e => e.status === 'completed').length;
      const groupWithdrawn = enrollments.filter(e => e.status === 'withdrawn').length;
      const groupCompletionRate = groupTotal > 0 ? (groupCompleted / groupTotal) * 100 : 0;

      // Calculate average progress
      let totalProgress = 0;
      for (const enrollment of enrollments) {
        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) continue;
        const context = await buildCourseLearningContext(classDoc.courseId.toString());
        if (!context) continue;
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
        const progress = context.modules.length > 0 ? (completedModules / context.modules.length) * 100 : 0;
        totalProgress += progress;
      }
      const avgProgress = groupTotal > 0 ? totalProgress / groupTotal : 0;

      // Calculate average time to complete for this group
      const groupCompletedEnrollments = enrollments.filter(e =>
        e.status === 'completed' && e.completionDate && e.enrollmentDate
      );
      const groupAvgTimeToComplete = groupCompletedEnrollments.length > 0
        ? groupCompletedEnrollments.reduce((sum, e) => {
            const time = (e.completionDate!.getTime() - e.enrollmentDate.getTime()) / 1000;
            return sum + time;
          }, 0) / groupCompletedEnrollments.length
        : 0;

      // Build details if requested
      const details: any[] = [];
      if (includeDetails) {
        for (const enrollment of enrollments.slice(0, 100)) { // Limit details to 100 per group
          const learner = await Learner.findById(enrollment.learnerId);
          const user = await User.findById(enrollment.learnerId);
          if (!learner || !user) continue;

          const classDoc = await Class.findById(enrollment.classId);
          if (!classDoc) continue;
          const context = await buildCourseLearningContext(classDoc.courseId.toString());
          if (!context) continue;
          const course = context.course;

          const program = course.programId
            ? await Program.findById(course.programId)
            : null;

          const dept = (learner as any).departmentId
            ? await Department.findById((learner as any).departmentId)
            : null;

          // Calculate progress
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
          const progress = context.modules.length > 0 ? (completedModules / context.modules.length) * 100 : 0;

          // Find first started attempt
          const firstAttempt = attempts.length > 0
            ? attempts.reduce((earliest, a) =>
                (!earliest || a.startedAt! < earliest.startedAt!) ? a : earliest
              )
            : null;

          // Find last accessed
          const lastAccessed = attempts.length > 0
            ? attempts.reduce((latest, a) => {
                const date = a.lastAccessedAt || a.updatedAt;
                return (!latest || date > latest) ? date : latest;
              }, null as Date | null)
            : null;

          // Calculate time to complete
          let timeToComplete: number | null = null;
          if (enrollment.status === 'completed' && enrollment.completionDate && firstAttempt?.startedAt) {
            timeToComplete = (enrollment.completionDate.getTime() - firstAttempt.startedAt.getTime()) / 1000;
          }

          details.push({
            learnerId: learner._id.toString(),
            learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
            learnerEmail: user.email,
            courseId: course._id.toString(),
            courseName: course.name,
            courseCode: course.code,
            programName: program?.name || null,
            departmentName: dept?.name || 'Unknown',
            status: enrollment.status,
            progress: Math.round(progress),
            enrolledAt: enrollment.enrollmentDate,
            startedAt: firstAttempt?.startedAt || null,
            completedAt: enrollment.completionDate || null,
            withdrawnAt: enrollment.withdrawnAt || null,
            timeToComplete,
            lastAccessedAt: lastAccessed
          });
        }
      }

      // Find group label from first enrollment if not set
      let finalGroupLabel = groupBy === 'status' || groupBy === 'month'
        ? groupKey.toUpperCase()
        : groupKey;

      if (enrollments.length > 0 && groupBy === 'course') {
        const classDoc = await Class.findById(enrollments[0].classId);
        if (classDoc) {
          const context = await buildCourseLearningContext(classDoc.courseId.toString());
          if (context) {
            finalGroupLabel = `${context.course.name} (${context.course.code})`;
          }
        }
      }

      groups.push({
        groupKey,
        groupLabel: finalGroupLabel,
        totalEnrollments: groupTotal,
        notStarted: groupNotStarted,
        inProgress: groupInProgress,
        completed: groupCompleted,
        withdrawn: groupWithdrawn,
        completionRate: Math.round(groupCompletionRate * 10) / 10,
        averageProgress: Math.round(avgProgress * 10) / 10,
        averageTimeToComplete: Math.round(groupAvgTimeToComplete),
        details
      });
    }

    // Apply pagination to groups
    const paginatedGroups = groups.slice(skip, skip + limit);

    return {
      summary: {
        totalEnrollments,
        notStarted,
        inProgress,
        completed,
        withdrawn,
        completionRate: Math.round(completionRate * 10) / 10,
        averageTimeToComplete: Math.round(avgTimeToComplete),
        generatedAt: new Date()
      },
      groups: paginatedGroups,
      filters: {
        programId: filters.programId || null,
        courseId: filters.courseId || null,
        classId: filters.classId || null,
        departmentId: filters.departmentId || null,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        status: filters.status || null,
        learnerId: filters.learnerId || null,
        groupBy
      },
      pagination: {
        page,
        limit,
        total: groups.length,
        totalPages: Math.ceil(groups.length / limit),
        hasNext: page * limit < groups.length,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get Performance Report
   */
  static async getPerformanceReport(filters: PerformanceReportFilters): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 500);
    const skip = (page - 1) * limit;

    // Build query for completed enrollments
    const enrollmentQuery: any = { status: 'completed' };

    if (filters.startDate || filters.endDate) {
      enrollmentQuery.completionDate = {};
      if (filters.startDate) enrollmentQuery.completionDate.$gte = filters.startDate;
      if (filters.endDate) enrollmentQuery.completionDate.$lte = filters.endDate;
    }

    if (filters.learnerId) {
      enrollmentQuery.learnerId = filters.learnerId;
    }

    // Filter by classId, courseId, or programId
    let classIds: mongoose.Types.ObjectId[] = [];

    if (filters.classId) {
      classIds = [new mongoose.Types.ObjectId(filters.classId)];
    } else if (filters.courseId) {
      const classes = await Class.find({ courseId: filters.courseId });
      classIds = classes.map(c => c._id);
    } else if (filters.programId) {
      const courses = await CanonicalCourse.find({ programId: filters.programId }).select('_id');
      const classes = await Class.find({ courseId: { $in: courses.map(c => c._id) } });
      classIds = classes.map(c => c._id);
    }

    if (classIds.length > 0) {
      enrollmentQuery.classId = { $in: classIds };
    }

    // Get all completed enrollments
    const allEnrollments = await ClassEnrollment.find(enrollmentQuery);

    // Group by learner
    const learnerMap = new Map<string, any[]>();
    for (const enrollment of allEnrollments) {
      const learnerId = enrollment.learnerId.toString();
      if (!learnerMap.has(learnerId)) {
        learnerMap.set(learnerId, []);
      }
      learnerMap.get(learnerId)!.push(enrollment);
    }

    // Build performance metrics for each learner
    const performanceMetrics: any[] = [];
    const allScores: number[] = [];

    for (const [learnerId, enrollments] of learnerMap.entries()) {
      const learner = await Learner.findById(learnerId);
      const user = await User.findById(learnerId);
      if (!learner || !user) continue;

      const dept = (learner as any).departmentId
        ? await Department.findById((learner as any).departmentId)
        : null;

      const coursePerformance: any[] = [];
      let totalScore = 0;
      let scoreCount = 0;
      let totalTimeSpent = 0;
      let totalCredits = 0;

      for (const enrollment of enrollments) {
        const classDoc = await Class.findById(enrollment.classId);
        if (!classDoc) continue;
        const context = await buildCourseLearningContext(classDoc.courseId.toString());
        if (!context) continue;
        const course = context.course;

        const program = course.programId
          ? await Program.findById(course.programId)
          : null;

        const contentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));
        const scormAttempts = contentIds.length > 0 ? await ScormAttempt.find({
          learnerId,
          contentId: { $in: contentIds }
        }) : [];

        const examResults = contentIds.length > 0 ? await ExamResult.find({
          learnerId,
          examId: { $in: contentIds },
          status: 'graded'
        }) : [];

        // Calculate course score
        let courseScore: number | null = null;
        if (enrollment.gradePercentage !== undefined && enrollment.gradePercentage !== null) {
          courseScore = enrollment.gradePercentage;
        } else if (examResults.length > 0) {
          const scores = examResults.filter(e => e.percentage !== undefined).map(e => e.percentage!);
          if (scores.length > 0) {
            courseScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
          }
        }

        if (courseScore !== null) {
          totalScore += courseScore;
          scoreCount++;
          allScores.push(courseScore);
        }

        // Calculate grade
        let grade = 'F';
        let passed = false;
        if (courseScore !== null) {
          if (courseScore >= 90) grade = 'A';
          else if (courseScore >= 80) grade = 'B';
          else if (courseScore >= 70) grade = 'C';
          else if (courseScore >= 60) grade = 'D';
          passed = courseScore >= 60;
        }

        // Calculate time spent
        const timeSpent = scormAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);
        totalTimeSpent += timeSpent;

        // Count attempts
        const attempts = new Set(scormAttempts.map(a => a.attemptNumber)).size;

        // Get assessment scores
        const assessmentScores = examResults.map(result => ({
          assessmentName: result.metadata?.title || 'Assessment',
          score: result.score || 0,
          maxScore: result.score || 100,
          percentage: result.percentage || 0,
          passed: result.passed || false
        }));

        // Add credits
        if (passed) {
          totalCredits += enrollment.creditsEarned || course.credits || 0;
        }

        coursePerformance.push({
          courseId: course._id.toString(),
          courseName: course.name,
          courseCode: course.code,
          programName: program?.name || null,
          score: courseScore,
          grade,
          passed,
          completedAt: enrollment.completionDate,
          timeSpent,
          attempts,
          assessmentScores
        });
      }

      const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

      // Apply minScore filter
      if (filters.minScore !== undefined && averageScore < filters.minScore) {
        continue;
      }

      // Calculate GPA (4.0 scale)
      let gpa: number | null = null;
      if (coursePerformance.length > 0) {
        const totalGradePoints = coursePerformance.reduce((sum, c) => {
          if (!c.score) return sum;
          if (c.score >= 90) return sum + 4.0;
          if (c.score >= 80) return sum + 3.0;
          if (c.score >= 70) return sum + 2.0;
          if (c.score >= 60) return sum + 1.0;
          return sum;
        }, 0);
        gpa = Math.round((totalGradePoints / coursePerformance.length) * 10) / 10;
      }

      performanceMetrics.push({
        learnerId: learner._id.toString(),
        learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
        learnerEmail: user.email,
        departmentName: dept?.name || 'Unknown',
        coursesCompleted: enrollments.length,
        averageScore,
        gpa,
        creditsEarned: totalCredits,
        totalTimeSpent,
        coursePerformance,
        rank: null,
        percentile: null
      });
    }

    // Sort by average score for rankings
    performanceMetrics.sort((a, b) => b.averageScore - a.averageScore);

    // Add rankings if requested
    if (filters.includeRankings) {
      performanceMetrics.forEach((metric, index) => {
        metric.rank = index + 1;
        metric.percentile = Math.round(((performanceMetrics.length - index) / performanceMetrics.length) * 1000) / 10;
      });
    }

    // Calculate summary statistics
    const totalLearners = performanceMetrics.length;
    const totalCourses = new Set(
      performanceMetrics.flatMap(m => m.coursePerformance.map((c: any) => c.courseId))
    ).size;

    const validScores = allScores.filter(s => s !== null);
    const averageScore = validScores.length > 0
      ? Math.round(validScores.reduce((sum, s) => sum + s, 0) / validScores.length)
      : 0;

    const sortedScores = [...validScores].sort((a, b) => a - b);
    const medianScore = sortedScores.length > 0
      ? sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
        : sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

    const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
    const lowestScore = validScores.length > 0 ? Math.min(...validScores) : 0;
    const passRate = validScores.length > 0
      ? (validScores.filter(s => s >= 60).length / validScores.length) * 100
      : 0;

    const averageGPA = performanceMetrics.filter(m => m.gpa !== null).length > 0
      ? performanceMetrics.filter(m => m.gpa !== null).reduce((sum, m) => sum + m.gpa!, 0) /
        performanceMetrics.filter(m => m.gpa !== null).length
      : 0;

    // Grade distribution
    const gradeDistribution = {
      A: validScores.filter(s => s >= 90).length,
      B: validScores.filter(s => s >= 80 && s < 90).length,
      C: validScores.filter(s => s >= 70 && s < 80).length,
      D: validScores.filter(s => s >= 60 && s < 70).length,
      F: validScores.filter(s => s < 60).length
    };

    // Score distribution
    const scoreDistribution = [
      { range: '90-100', count: validScores.filter(s => s >= 90).length, percentage: 0 },
      { range: '80-89', count: validScores.filter(s => s >= 80 && s < 90).length, percentage: 0 },
      { range: '70-79', count: validScores.filter(s => s >= 70 && s < 80).length, percentage: 0 },
      { range: '60-69', count: validScores.filter(s => s >= 60 && s < 70).length, percentage: 0 },
      { range: '0-59', count: validScores.filter(s => s < 60).length, percentage: 0 }
    ];
    scoreDistribution.forEach(bucket => {
      bucket.percentage = validScores.length > 0
        ? Math.round((bucket.count / validScores.length) * 1000) / 10
        : 0;
    });

    // Top performers (top 5)
    const topPerformers = performanceMetrics.slice(0, 5).map(m => ({
      learnerId: m.learnerId,
      learnerName: m.learnerName,
      averageScore: m.averageScore,
      gpa: m.gpa,
      coursesCompleted: m.coursesCompleted
    }));

    // Needs attention (bottom 5 with score < 70)
    const needsAttention = performanceMetrics
      .filter(m => m.averageScore < 70)
      .slice(-5)
      .map(m => ({
        learnerId: m.learnerId,
        learnerName: m.learnerName,
        averageScore: m.averageScore,
        coursesAtRisk: m.coursePerformance.filter((c: any) => !c.passed).length,
        lastActivityAt: m.coursePerformance.length > 0
          ? m.coursePerformance[m.coursePerformance.length - 1].completedAt
          : null
      }));

    // Apply pagination
    const paginatedMetrics = performanceMetrics.slice(skip, skip + limit);

    return {
      summary: {
        totalLearners,
        totalCourses,
        averageScore,
        medianScore: Math.round(medianScore),
        highestScore,
        lowestScore,
        passRate: Math.round(passRate * 10) / 10,
        averageGPA: Math.round(averageGPA * 10) / 10,
        gradeDistribution,
        generatedAt: new Date()
      },
      performanceMetrics: paginatedMetrics,
      analytics: {
        scoreDistribution,
        timeToCompletionDistribution: [], // Would need more data
        progressDistribution: {
          notStarted: 0,
          lowProgress: 0,
          mediumProgress: 0,
          highProgress: 0,
          completed: totalLearners
        },
        topPerformers,
        needsAttention
      },
      filters: {
        programId: filters.programId || null,
        courseId: filters.courseId || null,
        classId: filters.classId || null,
        departmentId: filters.departmentId || null,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        learnerId: filters.learnerId || null,
        minScore: filters.minScore || null
      },
      pagination: {
        page,
        limit,
        total: performanceMetrics.length,
        totalPages: Math.ceil(performanceMetrics.length / limit),
        hasNext: page * limit < performanceMetrics.length,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Get Learner Transcript
   */
  static async getLearnerTranscript(learnerId: string, programId?: string, includeInProgress = false): Promise<any> {
    // Validate learner
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const learner = await Learner.findById(learnerId);
    const user = await User.findById(learnerId);
    if (!learner || !user) {
      throw ApiError.notFound('Learner not found');
    }

    // Get program enrollments
    const enrollmentQuery: any = { learnerId };
    if (programId) {
      enrollmentQuery.programId = programId;
    }

    const programEnrollments = await Enrollment.find(enrollmentQuery);

    // Build programs data
    const programs: any[] = [];
    let totalCredits = 0;
    let programsCompleted = 0;
    let totalCoursesCompleted = 0;
    const allGPAs: number[] = [];

    for (const enrollment of programEnrollments) {
      const program = await Program.findById(enrollment.programId);
      if (!program) continue;

      const dept = program.departmentId
        ? await Department.findById(program.departmentId)
        : null;

      // Get courses for this program
      const programCourses = await CanonicalCourse.find({ programId: program._id }).select('_id');

      // Get class enrollments for these courses
      const programClasses = await Class.find({
        courseId: { $in: programCourses.map(c => c._id) }
      });

      const classEnrollments = await ClassEnrollment.find({
        learnerId,
        classId: { $in: programClasses.map(c => c._id) },
        status: includeInProgress ? { $in: ['completed', 'active', 'enrolled'] } : 'completed'
      });

      // Build course data
      const courses: any[] = [];
      let programCreditsEarned = 0;
      const programGrades: number[] = [];

      for (const classEnrollment of classEnrollments) {
        const classDoc = await Class.findById(classEnrollment.classId);
        if (!classDoc) continue;
        const context = await buildCourseLearningContext(classDoc.courseId.toString());
        if (!context) continue;
        const course = context.course;

        // Get exam results for score
        const contentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));
        const examResults = contentIds.length > 0 ? await ExamResult.find({
          learnerId,
          examId: { $in: contentIds },
          status: 'graded'
        }) : [];

        let courseScore: number | null = null;
        if (classEnrollment.gradePercentage !== undefined && classEnrollment.gradePercentage !== null) {
          courseScore = classEnrollment.gradePercentage;
        } else if (examResults.length > 0) {
          const scores = examResults.filter(e => e.percentage !== undefined).map(e => e.percentage!);
          if (scores.length > 0) {
            courseScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
          }
        }

        // Calculate grade
        let grade = 'IP';
        let passed = false;
        if (classEnrollment.status === 'completed' && courseScore !== null) {
          if (courseScore >= 90) grade = 'A';
          else if (courseScore >= 80) grade = 'B';
          else if (courseScore >= 70) grade = 'C';
          else if (courseScore >= 60) grade = 'D';
          else grade = 'F';
          passed = courseScore >= 60;
        }

        if (courseScore !== null) {
          programGrades.push(courseScore);
        }

        // Credits
        const credits = classEnrollment.creditsEarned || course.credits || 0;
        if (classEnrollment.status === 'completed' && passed) {
          programCreditsEarned += credits;
          totalCredits += credits;
        }

        // Determine term (use enrollment date)
        const term = `${classEnrollment.enrollmentDate.toLocaleString('default', { month: 'short' })} ${classEnrollment.enrollmentDate.getFullYear()}`;

        // Count attempts
        const scormAttempts = contentIds.length > 0 ? await ScormAttempt.find({
          learnerId,
          contentId: { $in: contentIds }
        }) : [];
        const attempts = new Set(scormAttempts.map(a => a.attemptNumber)).size;

        if (classEnrollment.status === 'completed') {
          totalCoursesCompleted++;
        }

        courses.push({
          courseId: course._id.toString(),
          courseCode: course.code,
          courseName: course.name,
          credits,
          term,
          completedAt: classEnrollment.completionDate || new Date(),
          grade,
          score: courseScore,
          passed,
          attempts
        });
      }

      // Calculate program GPA
      let cumulativeGPA: number | null = null;
      if (programGrades.length > 0) {
        const totalGradePoints = programGrades.reduce((sum, score) => {
          if (score >= 90) return sum + 4.0;
          if (score >= 80) return sum + 3.0;
          if (score >= 70) return sum + 2.0;
          if (score >= 60) return sum + 1.0;
          return sum;
        }, 0);
        cumulativeGPA = Math.round((totalGradePoints / programGrades.length) * 100) / 100;
        allGPAs.push(cumulativeGPA);
      }

      // Determine enrollment status
      let status: 'active' | 'completed' | 'withdrawn' = 'active';
      if (enrollment.status === 'completed' || enrollment.status === 'graduated') {
        status = 'completed';
        programsCompleted++;
      } else if (enrollment.status === 'withdrawn') {
        status = 'withdrawn';
      }

      // Determine honors
      let honors: string | null = null;
      if (cumulativeGPA !== null && status === 'completed') {
        if (cumulativeGPA >= 3.9) honors = 'Summa Cum Laude';
        else if (cumulativeGPA >= 3.7) honors = 'Magna Cum Laude';
        else if (cumulativeGPA >= 3.5) honors = 'Cum Laude';
      }

      programs.push({
        programId: program._id.toString(),
        programName: program.name,
        programCode: program.code,
        departmentName: dept?.name || 'Unknown',
        enrolledAt: enrollment.enrollmentDate,
        status,
        completedAt: enrollment.completionDate || null,
        withdrawnAt: (enrollment as any).withdrawnAt || null,
        cumulativeGPA,
        creditsEarned: programCreditsEarned,
        creditsRequired: program.requiredCredits || 0,
        honors,
        courses
      });
    }

    // Calculate overall GPA
    const overallGPA = allGPAs.length > 0
      ? Math.round((allGPAs.reduce((sum, gpa) => sum + gpa, 0) / allGPAs.length) * 100) / 100
      : null;

    // Collect all honors
    const honors = programs
      .filter(p => p.honors !== null)
      .map(p => p.honors!);

    // Generate transcript ID
    const transcriptId = `TRN-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${learnerId.slice(-4)}`;

    return {
      transcript: {
        learner: {
          id: learner._id.toString(),
          firstName: learner.person.firstName,
          lastName: learner.person.lastName,
          email: user.email,
          studentId: (learner as any).studentId || learner._id.toString() || null,
          dateOfBirth: learner.person.dateOfBirth || null
        },
        institution: {
          name: 'Professional Development Institute',
          address: '123 Learning St, Education City, EC 12345',
          logo: null,
          registrarName: 'System Administrator',
          registrarTitle: 'Registrar'
        },
        generatedAt: new Date(),
        transcriptId,
        isOfficial: true,
        programs,
        summary: {
          totalPrograms: programs.length,
          programsCompleted,
          totalCredits,
          overallGPA,
          totalCoursesCompleted,
          honors
        },
        signatures: [
          {
            name: 'System Administrator',
            title: 'Registrar',
            signedAt: new Date(),
            signature: null
          }
        ],
        officialSeal: null,
        disclaimers: [
          'This is an official transcript issued by the Learning Management System.',
          'Grades are final upon completion and cannot be changed without formal appeal.',
          'All credits and grades are based on institution standards.'
        ]
      }
    };
  }

  /**
   * Generate PDF Transcript
   */
  static async generatePDFTranscript(
    learnerId: string,
    programId?: string,
    includeInProgress = false,
    officialFormat = true,
    watermark = 'none'
  ): Promise<any> {
    // Get transcript data
    const transcriptData = await this.getLearnerTranscript(learnerId, programId, includeInProgress);

    // In a real implementation, this would generate a PDF using a library like pdfkit or puppeteer
    // For now, return metadata about the generated PDF

    const fileName = `transcript-${transcriptData.transcript.learner.firstName.toLowerCase()}-${transcriptData.transcript.learner.lastName.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;

    return {
      transcriptId: transcriptData.transcript.transcriptId,
      learnerId,
      fileUrl: `https://storage.example.com/transcripts/${transcriptData.transcript.transcriptId}.pdf`,
      fileName,
      fileSizeBytes: 245678, // Mock size
      format: 'pdf',
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isOfficial: officialFormat && watermark === 'none'
    };
  }

  /**
   * Get Course Report
   */
  static async getCourseReport(params: CourseReportParams): Promise<any> {
    const { courseId, classId, startDate, endDate, includeModules = true } = params;

    // Validate course
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw ApiError.badRequest('Invalid course ID');
    }

    const context = await buildCourseLearningContext(courseId);
    if (!context) {
      throw ApiError.notFound('Course not found');
    }
    const course = context.course;

    // Get program info
    const program = course.programId
      ? await Program.findById(course.programId)
      : null;

    const dept = course.departmentId
      ? await Department.findById(course.departmentId)
      : null;

    const instructors = course.instructorIds.map((id) => id.toString());

    // Get classes for this course
    let classes = await Class.find({ courseId });
    if (classId) {
      classes = classes.filter(c => c._id.toString() === classId);
    }

    // Get enrollments
    const enrollmentQuery: any = {
      classId: { $in: classes.map(c => c._id) }
    };

    if (startDate || endDate) {
      enrollmentQuery.enrollmentDate = {};
      if (startDate) enrollmentQuery.enrollmentDate.$gte = startDate;
      if (endDate) enrollmentQuery.enrollmentDate.$lte = endDate;
    }

    const enrollments = await ClassEnrollment.find(enrollmentQuery);

    // Calculate summary
    const totalEnrollments = enrollments.length;
    const activeEnrollments = enrollments.filter(e => ['enrolled', 'active'].includes(e.status)).length;
    const completedEnrollments = enrollments.filter(e => e.status === 'completed').length;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

    const courseContentIds = context.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));

    // Build learner data
    const learners: any[] = [];
    let totalScore = 0;
    let scoreCount = 0;
    let totalProgress = 0;
    let totalTimeSpent = 0;

    for (const enrollment of enrollments) {
      const learner = await Learner.findById(enrollment.learnerId);
      const user = await User.findById(enrollment.learnerId);
      if (!learner || !user) continue;

      // Get attempts
      const scormAttempts = courseContentIds.length > 0 ? await ScormAttempt.find({
        learnerId: enrollment.learnerId,
        contentId: { $in: courseContentIds }
      }) : [];

      const examResults = courseContentIds.length > 0 ? await ExamResult.find({
        learnerId: enrollment.learnerId,
        examId: { $in: courseContentIds },
        status: 'graded'
      }) : [];

      // Calculate progress
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
      const progress = context.modules.length > 0 ? (completedModules / context.modules.length) * 100 : 0;
      totalProgress += progress;

      // Calculate score
      let courseScore: number | null = null;
      if (enrollment.gradePercentage !== undefined && enrollment.gradePercentage !== null) {
        courseScore = enrollment.gradePercentage;
      } else if (examResults.length > 0) {
        const scores = examResults.filter(e => e.percentage !== undefined).map(e => e.percentage!);
        if (scores.length > 0) {
          courseScore = Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
        }
      }

      if (courseScore !== null) {
        totalScore += courseScore;
        scoreCount++;
      }

      // Calculate grade
      let grade: string | null = null;
      if (courseScore !== null) {
        if (courseScore >= 90) grade = 'A';
        else if (courseScore >= 80) grade = 'B';
        else if (courseScore >= 70) grade = 'C';
        else if (courseScore >= 60) grade = 'D';
        else grade = 'F';
      }

      // Calculate time spent
      const timeSpent = scormAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);
      totalTimeSpent += timeSpent;

      // Find last accessed
      const lastAccessedAt = scormAttempts.reduce((latest, attempt) => {
        const date = attempt.lastAccessedAt || attempt.updatedAt;
        return (!latest || date > latest) ? date : latest;
      }, null as Date | null);

      // Determine status
      let status: 'not_started' | 'in_progress' | 'completed' | 'withdrawn' = 'not_started';
      if (enrollment.status === 'completed') {
        status = 'completed';
      } else if (enrollment.status === 'withdrawn') {
        status = 'withdrawn';
      } else if (progress > 0) {
        status = 'in_progress';
      }

      // Build module progress
      const moduleProgress: any[] = [];
      if (includeModules) {
        for (const moduleContext of context.modules) {
          const contentAttempts = filterAttemptsByContentIds(scormAttempts, moduleContext.contentIds);
          const latestAttempt = contentAttempts[contentAttempts.length - 1];

          let moduleStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
          let moduleProgressPercent = 0;
          let moduleScore: number | null = null;

          if (latestAttempt) {
            const completedItems = countCompletedContentItems(
              contentAttempts as Array<{ contentId: mongoose.Types.ObjectId; status: string }>
            );

            if (moduleContext.contentIds.length > 0 && completedItems >= moduleContext.contentIds.length) {
              moduleStatus = 'completed';
              moduleProgressPercent = 100;
            } else if (latestAttempt.progressMeasure !== undefined) {
              moduleStatus = 'in_progress';
              moduleProgressPercent = Math.round((latestAttempt.progressMeasure || 0) * 100);
            }

            if (latestAttempt.scoreScaled !== undefined) {
              moduleScore = Math.round((latestAttempt.scoreScaled || 0) * 100);
            }
          }

          const moduleTimeSpent = contentAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);

          moduleProgress.push({
            moduleId: moduleContext.moduleId,
            moduleName: moduleContext.moduleTitle,
            moduleOrder: moduleContext.order,
            moduleType: moduleContext.moduleType,
            status: moduleStatus,
            progress: moduleProgressPercent,
            score: moduleScore,
            timeSpent: moduleTimeSpent,
            attempts: contentAttempts.length,
            completedAt: moduleStatus === 'completed' ? latestAttempt?.completedAt : null,
            learningUnitIds: moduleContext.learningUnitIds,
            learningUnitCount: moduleContext.learningUnitIds.length
          });
        }
      }

      // Find started at
      const startedAt = scormAttempts.length > 0
        ? scormAttempts.reduce((earliest: Date | null, a) => {
            if (!earliest || (a.startedAt && a.startedAt < earliest)) {
              return a.startedAt || null;
            }
            return earliest;
          }, null as Date | null)
        : null;

      learners.push({
        learnerId: learner._id.toString(),
        learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
        learnerEmail: user.email,
        enrolledAt: enrollment.enrollmentDate,
        startedAt,
        completedAt: enrollment.completionDate || null,
        status,
        progress: Math.round(progress),
        score: courseScore,
        grade,
        timeSpent,
        lastAccessedAt,
        moduleProgress
      });
    }

    // Calculate averages
    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    const averageProgress = totalEnrollments > 0 ? Math.round(totalProgress / totalEnrollments) : 0;

    const completedWithTime = enrollments.filter(e =>
      e.status === 'completed' && e.completionDate && e.enrollmentDate
    );
    const averageTimeToComplete = completedWithTime.length > 0
      ? Math.round(
          completedWithTime.reduce((sum, e) =>
            sum + (e.completionDate!.getTime() - e.enrollmentDate.getTime()) / 1000, 0
          ) / completedWithTime.length
        )
      : 0;

    const passRate = scoreCount > 0
      ? (enrollments.filter(e => e.gradePercentage !== undefined && e.gradePercentage >= 60).length / scoreCount) * 100
      : 0;

    // Module analytics
    const moduleAnalytics: any[] = [];
    if (includeModules) {
      for (const moduleContext of context.modules) {
        const moduleContentIds = moduleContext.contentIds.map((contentId) => new mongoose.Types.ObjectId(contentId));
        const allAttempts = moduleContentIds.length > 0 ? await ScormAttempt.find({
          contentId: { $in: moduleContentIds },
          learnerId: { $in: enrollments.map(e => e.learnerId) }
        }) : [];

        const completedCount = allAttempts.filter(a => ['completed', 'passed'].includes(a.status)).length;
        const moduleCompletionRate = allAttempts.length > 0 ? (completedCount / allAttempts.length) * 100 : 0;

        const scores = allAttempts
          .filter(a => a.scoreScaled !== undefined)
          .map(a => (a.scoreScaled || 0) * 100);
        const avgScore = scores.length > 0
          ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
          : 0;

        const avgTimeSpent = allAttempts.length > 0
          ? Math.round(allAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0) / allAttempts.length)
          : 0;

        const avgAttempts = allAttempts.length > 0
          ? allAttempts.reduce((sum, a) => sum + a.attemptNumber, 0) / allAttempts.length
          : 0;

        // Determine difficulty
        let difficultyRating: 'easy' | 'medium' | 'hard' = 'medium';
        if (avgScore >= 85 && avgAttempts < 1.5) {
          difficultyRating = 'easy';
        } else if (avgScore < 70 || avgAttempts >= 2.5) {
          difficultyRating = 'hard';
        }

        moduleAnalytics.push({
          moduleId: moduleContext.moduleId,
          moduleName: moduleContext.moduleTitle,
          moduleOrder: moduleContext.order,
          moduleType: moduleContext.moduleType,
          learningUnitIds: moduleContext.learningUnitIds,
          learningUnitCount: moduleContext.learningUnitIds.length,
          completionRate: Math.round(moduleCompletionRate * 10) / 10,
          averageScore: avgScore,
          averageTimeSpent: avgTimeSpent,
          averageAttempts: Math.round(avgAttempts * 10) / 10,
          difficultyRating
        });
      }
    }

    return {
      course: {
        id: course._id.toString(),
        title: course.name,
        code: course.code,
        credits: course.credits || 0,
        programName: program?.name || null,
        departmentName: dept?.name || 'Unknown',
        instructors
      },
      summary: {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRate: Math.round(completionRate * 10) / 10,
        averageScore,
        averageProgress,
        averageTimeToComplete,
        passRate: Math.round(passRate * 10) / 10
      },
      learners,
      moduleAnalytics,
      generatedAt: new Date()
    };
  }

  /**
   * Get Program Report
   */
  static async getProgramReport(params: ProgramReportParams): Promise<any> {
    const { programId, startDate, endDate } = params;

    // Validate program
    if (!mongoose.Types.ObjectId.isValid(programId)) {
      throw ApiError.badRequest('Invalid program ID');
    }

    const program = await Program.findById(programId);
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    const dept = program.departmentId
      ? await Department.findById(program.departmentId)
      : null;

    const programCourses = await CanonicalCourse.find({ programId }).select('_id');
    const programCourseContexts = await Promise.all(
      programCourses.map((course) => buildCourseLearningContext(course._id.toString()))
    );
    const courses = programCourseContexts.filter(
      (context): context is CourseLearningContext => context !== null
    );
    const courseOrder = new Map(courses.map((context, index) => [context.course._id.toString(), index + 1]));

    // Get program enrollments
    const enrollmentQuery: any = { programId };
    if (startDate || endDate) {
      enrollmentQuery.enrollmentDate = {};
      if (startDate) enrollmentQuery.enrollmentDate.$gte = startDate;
      if (endDate) enrollmentQuery.enrollmentDate.$lte = endDate;
    }

    const programEnrollments = await Enrollment.find(enrollmentQuery);

    // Calculate summary
    const totalEnrollments = programEnrollments.length;
    const activeEnrollments = programEnrollments.filter(e => e.status === 'active').length;
    const completedEnrollments = programEnrollments.filter(e => e.status === 'completed').length;
    const graduatedEnrollments = programEnrollments.filter(e => e.status === 'graduated').length;
    const withdrawnEnrollments = programEnrollments.filter(e => e.status === 'withdrawn').length;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;
    const graduationRate = totalEnrollments > 0 ? (graduatedEnrollments / totalEnrollments) * 100 : 0;

    // Build course performance
    const coursePerformance: any[] = [];
    for (const courseContext of courses) {
      const classes = await Class.find({ courseId: courseContext.course._id });
      const classIds = classes.map(c => c._id);

      const courseEnrollments = await ClassEnrollment.find({
        classId: { $in: classIds }
      });

      const courseCompleted = courseEnrollments.filter(e => e.status === 'completed').length;
      const courseCompletionRate = courseEnrollments.length > 0
        ? (courseCompleted / courseEnrollments.length) * 100
        : 0;

      // Calculate average score
      const scoresWithValues = courseEnrollments.filter(e =>
        e.gradePercentage !== undefined && e.gradePercentage !== null
      );
      const avgScore = scoresWithValues.length > 0
        ? Math.round(
            scoresWithValues.reduce((sum, e) => sum + e.gradePercentage!, 0) / scoresWithValues.length
          )
        : 0;

      const passRate = scoresWithValues.length > 0
        ? (scoresWithValues.filter(e => e.gradePercentage! >= 60).length / scoresWithValues.length) * 100
        : 0;

      coursePerformance.push({
        courseId: courseContext.course._id.toString(),
        courseName: courseContext.course.name,
        courseCode: courseContext.course.code,
        levelNumber: courseOrder.get(courseContext.course._id.toString()) || 1,
        totalEnrollments: courseEnrollments.length,
        completionRate: Math.round(courseCompletionRate * 10) / 10,
        averageScore: avgScore,
        passRate: Math.round(passRate * 10) / 10
      });
    }

    // Sort by level
    coursePerformance.sort((a, b) => a.levelNumber - b.levelNumber);

    // Build learner progress
    const learnerProgress: any[] = [];
    let totalCreditsEarned = 0;
    let totalGPA = 0;
    let gpaCount = 0;

    const programClasses = await Class.find({ courseId: { $in: courses.map(c => c.course._id) } });

    for (const enrollment of programEnrollments) {
      const learner = await Learner.findById(enrollment.learnerId);
      const user = await User.findById(enrollment.learnerId);
      if (!learner || !user) continue;

      // Get class enrollments for this learner in program
      const classEnrollments = await ClassEnrollment.find({
        learnerId: enrollment.learnerId,
        classId: { $in: programClasses.map(c => c._id) }
      });

      const coursesCompleted = classEnrollments.filter(e => e.status === 'completed').length;
      const creditsEarned = classEnrollments
        .filter(e => e.status === 'completed')
        .reduce((sum, e) => sum + (e.creditsEarned || 0), 0);
      totalCreditsEarned += creditsEarned;

      // Calculate GPA
      const grades = classEnrollments
        .filter(e => e.status === 'completed' && e.gradePercentage !== undefined)
        .map(e => e.gradePercentage!);

      let cumulativeGPA: number | null = null;
      if (grades.length > 0) {
        const gradePoints = grades.reduce((sum, score) => {
          if (score >= 90) return sum + 4.0;
          if (score >= 80) return sum + 3.0;
          if (score >= 70) return sum + 2.0;
          if (score >= 60) return sum + 1.0;
          return sum;
        }, 0);
        cumulativeGPA = Math.round((gradePoints / grades.length) * 100) / 100;
        totalGPA += cumulativeGPA;
        gpaCount++;
      }

      // Calculate progress
      const progress = courses.length > 0 ? (coursesCompleted / courses.length) * 100 : 0;

      // Find current level
      const currentLevel = Math.max(
        ...classEnrollments.map(e => {
          const classDoc = programClasses.find(c => c._id.toString() === e.classId.toString());
          if (!classDoc) return 0;
          return courseOrder.get(classDoc.courseId.toString()) || 1;
        }),
        1
      );

      // Find last activity
      const lastActivityAt = classEnrollments.reduce((latest, e) => {
        const date = e.updatedAt;
        return (!latest || date > latest) ? date : latest;
      }, null as Date | null);

      // Determine status
      let status: 'pending' | 'active' | 'completed' | 'graduated' | 'withdrawn' = enrollment.status as any;

      learnerProgress.push({
        learnerId: learner._id.toString(),
        learnerName: `${learner.person.firstName} ${learner.person.lastName}`,
        learnerEmail: user.email,
        enrolledAt: enrollment.enrollmentDate,
        status,
        currentLevel,
        coursesCompleted,
        creditsEarned,
        cumulativeGPA,
        progress: Math.round(progress),
        lastActivityAt
      });
    }

    const averageGPA = gpaCount > 0 ? Math.round((totalGPA / gpaCount) * 100) / 100 : 0;
    const averageCreditsEarned = totalEnrollments > 0
      ? Math.round(totalCreditsEarned / totalEnrollments)
      : 0;

    // Calculate average time to complete
    const completedWithTime = programEnrollments.filter(e =>
      e.status === 'completed' && e.completionDate && e.enrollmentDate
    );
    const averageTimeToComplete = completedWithTime.length > 0
      ? Math.round(
          completedWithTime.reduce((sum, e) =>
            sum + (e.completionDate!.getTime() - e.enrollmentDate.getTime()) / 1000, 0
          ) / completedWithTime.length
        )
      : 0;

    // Enrollment trends (quarterly)
    const enrollmentTrends: any[] = [];
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const currentYear = new Date().getFullYear();

    for (let year = currentYear - 1; year <= currentYear; year++) {
      for (const quarter of quarters) {
        const quarterStart = new Date(year, Math.floor(quarters.indexOf(quarter) * 3), 1);
        const quarterEnd = new Date(year, Math.floor(quarters.indexOf(quarter) * 3) + 3, 0);

        if (quarterStart > new Date()) break;

        const newEnrollments = programEnrollments.filter(e =>
          e.enrollmentDate >= quarterStart && e.enrollmentDate <= quarterEnd
        ).length;

        const completions = programEnrollments.filter(e =>
          e.completionDate && e.completionDate >= quarterStart && e.completionDate <= quarterEnd
        ).length;

        const withdrawals = programEnrollments.filter(e =>
          (e as any).withdrawnAt && (e as any).withdrawnAt >= quarterStart && (e as any).withdrawnAt <= quarterEnd
        ).length;

        enrollmentTrends.push({
          period: `${year}-${quarter}`,
          newEnrollments,
          completions,
          withdrawals
        });
      }
    }

    return {
      program: {
        id: program._id.toString(),
        name: program.name,
        code: program.code,
        departmentName: dept?.name || 'Unknown',
        totalCredits: program.requiredCredits || 0,
        totalCourses: courses.length,
        levels: courses.length > 0 ? Math.max(...Array.from(courseOrder.values())) : 0
      },
      summary: {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        graduatedEnrollments,
        withdrawnEnrollments,
        completionRate: Math.round(completionRate * 10) / 10,
        graduationRate: Math.round(graduationRate * 10) / 10,
        averageGPA,
        averageCreditsEarned,
        averageTimeToComplete
      },
      enrollmentTrends,
      coursePerformance,
      learnerProgress,
      generatedAt: new Date()
    };
  }

  /**
   * Get Department Report
   */
  static async getDepartmentReport(params: DepartmentReportParams): Promise<any> {
    const { departmentId, startDate, endDate, includeSubDepartments = false } = params;

    // Validate department
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      throw ApiError.badRequest('Invalid department ID');
    }

    const department = await Department.findById(departmentId);
    if (!department) {
      throw ApiError.notFound('Department not found');
    }

    // Get department IDs to include
    let departmentIds = [department._id];
    if (includeSubDepartments) {
      // Would need to implement subdepartment lookup
      // For now, just use the main department
    }

    // Get programs in department
    const programs = await Program.find({ departmentId: { $in: departmentIds } });

    // Get courses in department
    const departmentCourses = await CanonicalCourse.find({ departmentId: { $in: departmentIds } }).select('_id');
    const courseContexts = await Promise.all(
      departmentCourses.map((course) => buildCourseLearningContext(course._id.toString()))
    );
    const courses = courseContexts.filter(
      (context): context is CourseLearningContext => context !== null
    );

    // Get staff in department
    const staff = await Staff.find({ departmentId: { $in: departmentIds } });

    // Get learners in department
    const learners = await Learner.find({ departmentId: { $in: departmentIds } });

    // Get all class enrollments for department courses
    const classes = await Class.find({ courseId: { $in: courses.map(c => c.course._id) } });

    const enrollmentQuery: any = {
      classId: { $in: classes.map(c => c._id) }
    };

    if (startDate || endDate) {
      enrollmentQuery.enrollmentDate = {};
      if (startDate) enrollmentQuery.enrollmentDate.$gte = startDate;
      if (endDate) enrollmentQuery.enrollmentDate.$lte = endDate;
    }

    const allEnrollments = await ClassEnrollment.find(enrollmentQuery);

    // Calculate summary
    const totalEnrollments = allEnrollments.length;
    const activeEnrollments = allEnrollments.filter(e => ['enrolled', 'active'].includes(e.status)).length;
    const completedEnrollments = allEnrollments.filter(e => e.status === 'completed').length;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

    // Calculate average GPA and score
    const scoresWithValues = allEnrollments.filter(e =>
      e.gradePercentage !== undefined && e.gradePercentage !== null
    );
    const averageScore = scoresWithValues.length > 0
      ? Math.round(
          scoresWithValues.reduce((sum, e) => sum + e.gradePercentage!, 0) / scoresWithValues.length
        )
      : 0;

    const grades = scoresWithValues.map(e => e.gradePercentage!);
    const gradePoints = grades.reduce((sum, score) => {
      if (score >= 90) return sum + 4.0;
      if (score >= 80) return sum + 3.0;
      if (score >= 70) return sum + 2.0;
      if (score >= 60) return sum + 1.0;
      return sum;
    }, 0);
    const averageGPA = grades.length > 0
      ? Math.round((gradePoints / grades.length) * 100) / 100
      : 0;

    const totalCreditsEarned = allEnrollments
      .filter(e => e.status === 'completed')
      .reduce((sum, e) => sum + (e.creditsEarned || 0), 0);

    // Program performance
    const programPerformance: any[] = [];
    for (const program of programs) {
      const programEnrollments = await Enrollment.find({ programId: program._id });

      const programActive = programEnrollments.filter(e => e.status === 'active').length;
      const programCompleted = programEnrollments.filter(e =>
        e.status === 'completed' || e.status === 'graduated'
      ).length;
      const programCompletionRate = programEnrollments.length > 0
        ? (programCompleted / programEnrollments.length) * 100
        : 0;

      // Calculate program GPA
      let programGPA = 0;
      let programGPACount = 0;

      const programCourses = await CanonicalCourse.find({ programId: program._id }).select('_id');
      const programClasses = await Class.find({ courseId: { $in: programCourses.map(c => c._id) } });

      for (const enrollment of programEnrollments) {
        const learnerEnrollments = await ClassEnrollment.find({
          learnerId: enrollment.learnerId,
          classId: { $in: programClasses.map(c => c._id) },
          status: 'completed',
          gradePercentage: { $ne: null }
        });

        if (learnerEnrollments.length > 0) {
          const learnerGrades = learnerEnrollments.map(e => e.gradePercentage!);
          const learnerGradePoints = learnerGrades.reduce((sum, score) => {
            if (score >= 90) return sum + 4.0;
            if (score >= 80) return sum + 3.0;
            if (score >= 70) return sum + 2.0;
            if (score >= 60) return sum + 1.0;
            return sum;
          }, 0);
          programGPA += learnerGradePoints / learnerGrades.length;
          programGPACount++;
        }
      }

      const avgProgramGPA = programGPACount > 0
        ? Math.round((programGPA / programGPACount) * 100) / 100
        : 0;

      programPerformance.push({
        programId: program._id.toString(),
        programName: program.name,
        programCode: program.code,
        totalEnrollments: programEnrollments.length,
        activeEnrollments: programActive,
        completedEnrollments: programCompleted,
        completionRate: Math.round(programCompletionRate * 10) / 10,
        averageGPA: avgProgramGPA
      });
    }

    // Course performance
    const coursePerformance: any[] = [];
    for (const courseContext of courses.slice(0, 50)) { // Limit to 50 courses
      const courseclasses = await Class.find({ courseId: courseContext.course._id });
      const courseEnrollments = await ClassEnrollment.find({
        classId: { $in: courseclasses.map(c => c._id) }
      });

      const courseCompleted = courseEnrollments.filter(e => e.status === 'completed').length;
      const courseCompletionRate = courseEnrollments.length > 0
        ? (courseCompleted / courseEnrollments.length) * 100
        : 0;

      const courseScores = courseEnrollments.filter(e =>
        e.gradePercentage !== undefined && e.gradePercentage !== null
      );
      const avgCourseScore = courseScores.length > 0
        ? Math.round(
            courseScores.reduce((sum, e) => sum + e.gradePercentage!, 0) / courseScores.length
          )
        : 0;

      const passRate = courseScores.length > 0
        ? (courseScores.filter(e => e.gradePercentage! >= 60).length / courseScores.length) * 100
        : 0;

      const program = courseContext.course.programId
        ? await Program.findById(courseContext.course.programId)
        : null;

      coursePerformance.push({
        courseId: courseContext.course._id.toString(),
        courseName: courseContext.course.name,
        courseCode: courseContext.course.code,
        programName: program?.name || null,
        totalEnrollments: courseEnrollments.length,
        completionRate: Math.round(courseCompletionRate * 10) / 10,
        averageScore: avgCourseScore,
        passRate: Math.round(passRate * 10) / 10
      });
    }

    // Staff activity
    const staffActivity: any[] = [];
    for (const staffMember of staff) {
      const user = await User.findById(staffMember._id);
      if (!user) continue;

      const instructorCourseIds = courses
        .filter((context) =>
          context.course.instructorIds.some((instructorId) => instructorId.toString() === staffMember._id.toString())
        )
        .map((context) => context.course._id.toString());

      const managedClasses = await Class.find({
        courseId: { $in: courses.map((context) => context.course._id) },
        'metadata.instructorId': staffMember._id
      });

      const managedCourseIds = new Set<string>([
        ...instructorCourseIds,
        ...managedClasses.map((managedClass) => managedClass.courseId.toString())
      ]);

      const staffEnrollments = await ClassEnrollment.find({
        classId: { $in: managedClasses.map(c => c._id) },
        status: { $in: ['enrolled', 'active'] }
      });

      staffActivity.push({
        staffId: staffMember._id.toString(),
        staffName: `${staffMember.person.firstName} ${staffMember.person.lastName}`,
        role: (staffMember as any).role || 'Instructor' || 'Instructor',
        coursesManaged: managedCourseIds.size,
        activeEnrollments: staffEnrollments.length,
        lastActivityAt: user.updatedAt
      });
    }

    // Learner engagement
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get activity data
    const recentAttempts = await ScormAttempt.find({
      learnerId: { $in: learners.map(l => l._id) },
      lastAccessedAt: { $gte: oneMonthAgo }
    });

    const dailyActiveUsers = new Set(
      recentAttempts
        .filter(a => a.lastAccessedAt && a.lastAccessedAt >= oneDayAgo)
        .map(a => a.learnerId.toString())
    ).size;

    const weeklyActiveUsers = new Set(
      recentAttempts
        .filter(a => a.lastAccessedAt && a.lastAccessedAt >= oneWeekAgo)
        .map(a => a.learnerId.toString())
    ).size;

    const monthlyActiveUsers = new Set(
      recentAttempts.map(a => a.learnerId.toString())
    ).size;

    const totalTimeSpent = recentAttempts.reduce((sum, a) => sum + (a.totalTime || 0), 0);
    const averageSessionDuration = recentAttempts.length > 0
      ? Math.round(totalTimeSpent / recentAttempts.length)
      : 0;

    return {
      department: {
        id: department._id.toString(),
        name: department.name,
        code: department.code,
        parentDepartment: department.parentDepartmentId ? 'Parent Department' : null,
        totalPrograms: programs.length,
        totalCourses: courses.length,
        totalStaff: staff.length,
        totalLearners: learners.length
      },
      summary: {
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        completionRate: Math.round(completionRate * 10) / 10,
        averageGPA,
        averageScore,
        totalCreditsEarned
      },
      programPerformance,
      coursePerformance,
      staffActivity,
      learnerEngagement: {
        totalActiveLearners: learners.length,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        averageSessionDuration,
        totalTimeSpent
      },
      generatedAt: new Date()
    };
  }

  /**
   * Export Report Data
   */
  static async exportReport(filters: ExportReportFilters): Promise<any> {
    const { reportType, format, includeDetails = true } = filters;

    // Generate report data based on type
    let reportData: any;
    let recordCount = 0;

    switch (reportType) {
      case 'completion':
        reportData = await this.getCompletionReport({
          programId: filters.programId,
          courseId: filters.courseId,
          classId: filters.classId,
          departmentId: filters.departmentId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          learnerId: filters.learnerId,
          includeDetails,
          page: 1,
          limit: 10000
        });
        recordCount = reportData.summary.totalEnrollments;
        break;

      case 'performance':
        reportData = await this.getPerformanceReport({
          programId: filters.programId,
          courseId: filters.courseId,
          classId: filters.classId,
          departmentId: filters.departmentId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          learnerId: filters.learnerId,
          page: 1,
          limit: 10000
        });
        recordCount = reportData.summary.totalLearners;
        break;

      case 'course':
        if (!filters.courseId) {
          throw ApiError.badRequest('courseId is required for course reports');
        }
        reportData = await this.getCourseReport({
          courseId: filters.courseId,
          classId: filters.classId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          includeModules: includeDetails
        });
        recordCount = reportData.summary.totalEnrollments;
        break;

      case 'program':
        if (!filters.programId) {
          throw ApiError.badRequest('programId is required for program reports');
        }
        reportData = await this.getProgramReport({
          programId: filters.programId,
          startDate: filters.startDate,
          endDate: filters.endDate
        });
        recordCount = reportData.summary.totalEnrollments;
        break;

      case 'department':
        if (!filters.departmentId) {
          throw ApiError.badRequest('departmentId is required for department reports');
        }
        reportData = await this.getDepartmentReport({
          departmentId: filters.departmentId,
          startDate: filters.startDate,
          endDate: filters.endDate
        });
        recordCount = reportData.summary.totalEnrollments;
        break;

      default:
        throw ApiError.badRequest('Invalid report type');
    }

    // In a real implementation, would generate actual file based on format
    // For now, return metadata about the export

    const fileName = `${reportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
    const fileUrl = `https://storage.example.com/exports/${fileName}`;

    return {
      reportType,
      format,
      fileUrl,
      fileName,
      fileSizeBytes: Math.floor(Math.random() * 1000000) + 100000, // Mock size
      recordCount,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      filters: {
        programId: filters.programId || null,
        courseId: filters.courseId || null,
        classId: filters.classId || null,
        departmentId: filters.departmentId || null,
        startDate: filters.startDate || null,
        endDate: filters.endDate || null,
        learnerId: filters.learnerId || null
      }
    };
  }

  /**
   * Apply department scoping to transcript filtering
   *
   * Business Rule: Department-admin can only see transcripts for courses in their department
   */
  static async filterTranscriptByDepartment(transcript: any, user: any): Promise<any> {
    // Global admins see everything
    if (user.userTypes?.includes('global-admin') || user.allAccessRights?.includes('system:*')) {
      return transcript;
    }

    // For department-admin, filter programs and courses to their department
    const isDepartmentAdmin = user.departmentMemberships?.some((m: any) => m.roles?.includes('department-admin'));
    if (isDepartmentAdmin) {
      const userDepartmentIds = user.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];

      if (userDepartmentIds.length === 0) {
        // No department - return empty transcript
        transcript.programs = [];
        return transcript;
      }

      // Expand department IDs to include subdepartments
      const expandedDeptIds: string[] = [];
      for (const deptId of userDepartmentIds) {
        const deptHierarchy = await getDepartmentAndSubdepartments(deptId);
        expandedDeptIds.push(...deptHierarchy);
      }

      // Filter programs to only those in user's departments
      const filteredPrograms = [];
      for (const program of transcript.programs) {
        // Get program's courses
        const courses = await CanonicalCourse.find({
          '_id': { $in: program.courses.map((c: any) => c.courseId) }
        });

        // Filter courses to those in user's departments
        const visibleCourses = program.courses.filter((course: any) => {
          const matchingCourse = courses.find(c => c._id.toString() === course.courseId);
          if (!matchingCourse) return false;
          return expandedDeptIds.includes(matchingCourse.departmentId.toString());
        });

        // Only include program if it has visible courses
        if (visibleCourses.length > 0) {
          filteredPrograms.push({
            ...program,
            courses: visibleCourses
          });
        }
      }

      transcript.programs = filteredPrograms;
    }

    return transcript;
  }

  /**
   * Apply instructor class scoping to report queries
   *
   * Business Rule: Instructors can only see reports for their assigned classes
   */
  static async applyInstructorClassScoping(filters: any, user: any): Promise<any> {
    // Check if user has instructor role in any department membership
    const isInstructor = user.departmentMemberships?.some((m: any) => m.roles?.includes('instructor'));
    if (!isInstructor) {
      return filters;
    }

    // Get instructor's assigned class IDs
    const instructorClasses = await Class.find({
      'metadata.instructorId': user._id
    }).select('_id courseId');

    const classIds = instructorClasses.map(c => c._id.toString());
    const courseIds = instructorClasses.map(c => c.courseId.toString());

    // Apply class filter if not already specified
    if (!filters.classId && !filters.courseId) {
      filters.classId = classIds.length > 0 ? classIds[0] : null;
    }

    // If classId specified, verify it's in instructor's classes
    if (filters.classId && !classIds.includes(filters.classId)) {
      filters.classId = null; // Not authorized
    }

    // If courseId specified, verify it's in instructor's courses
    if (filters.courseId && !courseIds.includes(filters.courseId)) {
      filters.courseId = null; // Not authorized
    }

    return filters;
  }

  /**
   * Apply department scoping to report queries
   *
   * Business Rule: Department-admin can only see reports for their department
   */
  static async applyDepartmentScoping(filters: any, user: any): Promise<any> {
    // Global admins see all (system-admin, enrollment-admin)
    if (user.userTypes?.includes('global-admin') || user.allAccessRights?.includes('system:*')) {
      return filters;
    }

    // For department-admin, apply department filtering
    const isDepartmentAdmin = user.departmentMemberships?.some((m: any) => m.roles?.includes('department-admin'));
    if (isDepartmentAdmin) {
      const userDepartmentIds = user.departmentMemberships?.map((m: any) => m.departmentId.toString()) || [];

      if (userDepartmentIds.length === 0) {
        // No department - no data visible
        filters.departmentId = 'none';
        return filters;
      }

      // Expand department IDs to include subdepartments
      const expandedDeptIds: string[] = [];
      for (const deptId of userDepartmentIds) {
        const deptHierarchy = await getDepartmentAndSubdepartments(deptId);
        expandedDeptIds.push(...deptHierarchy);
      }

      // If department not specified, use user's first department
      if (!filters.departmentId) {
        filters.departmentId = expandedDeptIds[0];
      }

      // If department specified, verify it's in user's departments
      if (filters.departmentId && !expandedDeptIds.includes(filters.departmentId)) {
        filters.departmentId = 'none'; // Not authorized
      }
    }

    return filters;
  }

  /**
   * Apply combined authorization scoping to report filters
   *
   * Combines instructor and department scoping for reports
   */
  static async applyAuthorizationScoping(filters: any, user: any): Promise<any> {
    // First apply instructor scoping (if instructor)
    filters = await this.applyInstructorClassScoping(filters, user);

    // Then apply department scoping (if department-admin)
    filters = await this.applyDepartmentScoping(filters, user);

    return filters;
  }

  /**
   * Apply data masking to learner information in reports
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
   * Apply data masking to a list of learner records in reports
   */
  static applyDataMaskingToList(learners: any[], user: any): any[] {
    return learners.map(learner => this.applyDataMasking(learner, user));
  }
}
