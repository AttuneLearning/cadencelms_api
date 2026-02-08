import Enrollment from '@/models/enrollment/Enrollment.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import { User } from '@/models/auth/User.model';
import { ApiError } from '@/utils/ApiError';
import mongoose from 'mongoose';

export class ProgramProgressService {
  /**
   * Get progress for a specific program enrollment
   */
  static async getEnrollmentProgress(enrollmentId: string, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
      throw ApiError.badRequest('Invalid enrollment ID');
    }

    // Fetch enrollment
    const enrollment = await Enrollment.findById(enrollmentId).lean();
    if (!enrollment) {
      throw ApiError.notFound('Enrollment not found');
    }

    // Check access: owner or staff
    const user = await User.findById(userId).lean();
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    const isOwner = enrollment.learnerId.toString() === userId;
    const isStaff = user.userTypes?.some((r: string) => ['global-admin', 'staff'].includes(r));

    if (!isOwner && !isStaff) {
      throw ApiError.forbidden('Cannot view progress for this enrollment');
    }

    // Verify this is a program enrollment (not a course enrollment stored in Enrollment)
    const enrollmentType = enrollment.metadata?.enrollmentType;
    if (enrollmentType === 'course') {
      throw ApiError.badRequest('This endpoint is for program enrollments only');
    }

    // Fetch program
    const program = await Program.findById(enrollment.programId).lean();
    if (!program) {
      throw ApiError.notFound('Program not found');
    }

    // Get program courses — courses that belong to the same department as the program
    const programDepartmentId = (program as any).departmentId;
    const courses = await Course.find({
      departmentId: programDepartmentId,
      status: 'published'
    }).select('_id name code status').lean();

    // Get learner's course enrollments for these courses
    const courseIds = courses.map(c => c._id.toString());
    const courseEnrollments = await Enrollment.find({
      learnerId: enrollment.learnerId,
      'metadata.courseId': { $in: courseIds },
      'metadata.enrollmentType': 'course'
    }).lean();

    // Build enrollment map by courseId
    const courseEnrollmentMap = new Map<string, any>();
    for (const ce of courseEnrollments) {
      const courseId = ce.metadata?.courseId;
      if (courseId) {
        courseEnrollmentMap.set(courseId, ce);
      }
    }

    // Build per-course progress
    const courseProgress = courses.map(course => {
      const courseEnrollment = courseEnrollmentMap.get(course._id.toString());

      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      if (courseEnrollment) {
        if (courseEnrollment.status === 'completed' || courseEnrollment.status === 'graduated') {
          status = 'completed';
        } else if (['active', 'pending', 'suspended'].includes(courseEnrollment.status)) {
          status = 'in_progress';
        }
      }

      return {
        courseId: course._id.toString(),
        title: (course as any).name || (course as any).title,
        code: (course as any).code,
        status,
        enrollmentId: courseEnrollment?._id?.toString() || null,
        enrolledAt: courseEnrollment?.enrollmentDate || null,
        completedAt: courseEnrollment?.completionDate || null
      };
    });

    // Calculate overall progress
    const totalCourses = courseProgress.length;
    const completedCourses = courseProgress.filter(c => c.status === 'completed').length;
    const inProgressCourses = courseProgress.filter(c => c.status === 'in_progress').length;
    const notStartedCourses = courseProgress.filter(c => c.status === 'not_started').length;
    const progressPercentage = totalCourses > 0
      ? Math.round((completedCourses / totalCourses) * 100)
      : 0;

    return {
      enrollmentId: enrollment._id.toString(),
      programId: program._id.toString(),
      programName: (program as any).name,
      programCode: (program as any).code,
      learnerId: enrollment.learnerId.toString(),
      status: enrollment.status,
      enrolledAt: enrollment.enrollmentDate,
      progress: {
        percentage: progressPercentage,
        completedCourses,
        inProgressCourses,
        notStartedCourses,
        totalCourses
      },
      courses: courseProgress
    };
  }
}
