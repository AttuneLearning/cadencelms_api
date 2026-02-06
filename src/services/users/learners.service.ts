import mongoose from 'mongoose';
import { User } from '@/models/auth/User.model';
import { Learner } from '@/models/auth/Learner.model';
import Department from '@/models/organization/Department.model';
import Enrollment from '@/models/enrollment/Enrollment.model';
import ClassEnrollment from '@/models/enrollment/ClassEnrollment.model';
import ContentAttempt from '@/models/content/ContentAttempt.model';
import Program from '@/models/academic/Program.model';
import Course from '@/models/academic/Course.model';
import { hashPassword } from '@/utils/password';
import { ApiError } from '@/utils/ApiError';
import { maskLastName, maskLearnersForViewer } from '@/utils/dataMasking';
import { getDepartmentAndSubdepartments } from '@/utils/departmentHierarchy';

interface ListLearnersFilters {
  page?: number;
  limit?: number;
  search?: string;
  program?: string;
  status?: 'active' | 'withdrawn' | 'completed' | 'suspended';
  department?: string;
  includeSubdepartments?: boolean;
  sort?: string;
}

interface RegisterLearnerInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId?: string;
  department?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

interface UpdateLearnerInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  studentId?: string;
  department?: string;
  phone?: string;
  dateOfBirth?: Date;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  status?: 'active' | 'suspended';
}

export class LearnersService {
  /**
   * List learners with filtering and pagination
   * Applies FERPA-compliant data masking based on viewer's role
   *
   * @param filters - Filtering and pagination options
   * @param viewer - The user viewing the data (for data masking)
   */
  static async listLearners(filters: ListLearnersFilters, viewer: any): Promise<any> {
    // Use optimized aggregation when filtering by department
    if (filters.department) {
      return this.listLearnersByDepartmentOptimized(filters, viewer);
    }

    // Original implementation for non-department queries
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const skip = (page - 1) * limit;

    // Build query for User collection
    const userQuery: any = { userTypes: 'learner' };

    // Map status filter to User.isActive
    if (filters.status) {
      if (filters.status === 'active') {
        userQuery.isActive = true;
      } else if (filters.status === 'suspended') {
        userQuery.isActive = false;
      }
      // 'withdrawn' and 'completed' will be filtered from enrollments
    }

    // Search filter
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');

      // Get learners matching firstName/lastName
      const learners = await Learner.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex }
        ]
      }).select('_id');

      const learnerIds = learners.map(l => l._id);

      // Combine with email search
      userQuery.$or = [
        { _id: { $in: learnerIds } },
        { email: searchRegex }
      ];
    }

    // Get users matching initial filters
    let users = await User.find(userQuery);

    // Filter by program if provided
    if (filters.program) {
      const enrollmentsInProgram = await Enrollment.find({
        programId: filters.program,
        learnerId: { $in: users.map(u => u._id) }
      }).distinct('learnerId');

      users = users.filter(u => enrollmentsInProgram.some(id => id.equals(u._id)));
    }

    // Filter by withdrawn/completed status from enrollments
    if (filters.status === 'withdrawn' || filters.status === 'completed') {
      const statusMap = {
        'withdrawn': 'withdrawn',
        'completed': 'completed'
      };

      const enrollmentsWithStatus = await Enrollment.find({
        learnerId: { $in: users.map(u => u._id) },
        status: statusMap[filters.status]
      }).distinct('learnerId');

      users = users.filter(u => enrollmentsWithStatus.some(id => id.equals(u._id)));
    }

    // Get total count before pagination
    const total = users.length;

    // Apply sorting
    const sortField = filters.sort || '-createdAt';
    const sortDirection = sortField.startsWith('-') ? -1 : 1;
    const sortKey = sortField.replace(/^-/, '');

    if (sortKey === 'firstName' || sortKey === 'lastName') {
      // Need to join with Learner data for name sorting
      const learnerData = await Learner.find({
        _id: { $in: users.map(u => u._id) }
      });

      const learnerMap = new Map(learnerData.map(l => [l._id.toString(), l]));

      users.sort((a, b) => {
        const aLearner = learnerMap.get(a._id.toString());
        const bLearner = learnerMap.get(b._id.toString());

        if (!aLearner || !bLearner) return 0;

        const aValue = sortKey === 'firstName' ? aLearner.person.firstName : aLearner.person.lastName;
        const bValue = sortKey === 'firstName' ? bLearner.person.firstName : bLearner.person.lastName;

        return sortDirection * aValue.localeCompare(bValue);
      });
    } else if (sortKey === 'createdAt') {
      users.sort((a, b) => {
        return sortDirection * (a.createdAt.getTime() - b.createdAt.getTime());
      });
    }

    // Apply pagination
    const paginatedUsers = users.slice(skip, skip + limit);

    // Build learner response objects
    const learners = [];
    for (const user of paginatedUsers) {
      const learner = await Learner.findById(user._id);
      if (!learner) continue;

      // Get department info (from first program enrollment)
      let departmentInfo = null;
      const firstEnrollment = await Enrollment.findOne({ learnerId: user._id }).populate('programId');
      if (firstEnrollment && firstEnrollment.programId) {
        const program = firstEnrollment.programId as any;
        const department = await Department.findById(program.departmentId);
        if (department) {
          departmentInfo = {
            id: department._id.toString(),
            name: department.name
          };
        }
      }

      // Get enrollment counts
      const programEnrollments = await Enrollment.countDocuments({ learnerId: user._id });
      const courseEnrollments = await ClassEnrollment.countDocuments({ learnerId: user._id });

      // Calculate completion rate
      const totalCourses = await ClassEnrollment.countDocuments({ learnerId: user._id });
      const completedCourses = await ClassEnrollment.countDocuments({
        learnerId: user._id,
        status: 'completed'
      });
      const completionRate = totalCourses > 0 ? completedCourses / totalCourses : 0;

      // Determine learner status
      let learnerStatus: 'active' | 'withdrawn' | 'completed' | 'suspended' = 'active';
      if (!user.isActive) {
        learnerStatus = 'suspended';
      } else {
        const allEnrollments = await Enrollment.find({ learnerId: user._id });
        if (allEnrollments.length > 0) {
          const allWithdrawn = allEnrollments.every(e => e.status === 'withdrawn');
          const allCompleted = allEnrollments.every(e => e.status === 'completed' || e.status === 'graduated');

          if (allWithdrawn) {
            learnerStatus = 'withdrawn';
          } else if (allCompleted) {
            learnerStatus = 'completed';
          }
        }
      }

      learners.push({
        id: user._id.toString(),
        email: user.email,
        firstName: learner.person.firstName,
        lastName: learner.person.lastName,
        studentId: null, // Will be stored in metadata or custom field
        status: learnerStatus,
        department: departmentInfo,
        programEnrollments,
        courseEnrollments,
        completionRate,
        lastLogin: null, // Would need session tracking
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    }

    const totalPages = Math.ceil(total / limit);

    // Apply permission-based data masking
    // learner:pii:read → full data with displayName and idSuffix
    // learner:directory:read only → "LastName, F." + idSuffix, no email/PII
    const maskedLearners = viewer ? maskLearnersForViewer(learners, viewer) : learners;

    return {
      learners: maskedLearners,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Optimized learner listing with prioritization when department filter provided
   *
   * Returns ALL learners with program enrollees prioritized first:
   * 1. Learners enrolled in department's programs (isProgramEnrollee: true)
   * 2. All other learners (isProgramEnrollee: false)
   *
   * @param filters - Filtering and pagination options (must include department)
   * @param viewer - The user viewing the data (for data masking)
   */
  private static async listLearnersByDepartmentOptimized(
    filters: ListLearnersFilters,
    viewer: any
  ): Promise<any> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const skip = (page - 1) * limit;

    // Get department IDs (including subdepartments if requested)
    let departmentIds: string[];
    if (filters.includeSubdepartments) {
      departmentIds = await getDepartmentAndSubdepartments(filters.department!);
    } else {
      departmentIds = [filters.department!];
    }

    // Convert to ObjectIds
    const departmentObjectIds = departmentIds.map(id => new mongoose.Types.ObjectId(id));

    // Step 1: Get program IDs for the department(s)
    const programIds = await Program.find({
      departmentId: { $in: departmentObjectIds }
    }).distinct('_id');

    // Step 2: Get learner IDs enrolled in those programs
    const programEnrolleeIds = await Enrollment.find({
      programId: { $in: programIds }
    }).distinct('learnerId');

    const programEnrolleeIdStrings = new Set(programEnrolleeIds.map(id => id.toString()));

    // Step 3: Build user query for ALL learners
    const userQuery: any = { userTypes: 'learner' };
    if (filters.status === 'active') {
      userQuery.isActive = true;
    } else if (filters.status === 'suspended') {
      userQuery.isActive = false;
    }

    // Step 4: Build search filter
    let searchLearnerIds: mongoose.Types.ObjectId[] | null = null;
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      const matchingLearners = await Learner.find({
        $or: [
          { 'person.firstName': searchRegex },
          { 'person.lastName': searchRegex }
        ]
      }).select('_id');
      searchLearnerIds = matchingLearners.map(l => l._id);

      // Also search by email
      userQuery.$or = [
        { _id: { $in: searchLearnerIds } },
        { email: searchRegex }
      ];
    }

    // Step 5: Get all matching users
    const allUsers = await User.find(userQuery);

    // Step 6: Build learner data with prioritization
    const learners = [];
    for (const user of allUsers) {
      const learner = await Learner.findById(user._id);
      if (!learner) continue;

      const isProgramEnrollee = programEnrolleeIdStrings.has(user._id.toString());

      // Get enrollment counts
      const programEnrollments = await Enrollment.countDocuments({ learnerId: user._id });
      const courseEnrollments = await ClassEnrollment.countDocuments({ learnerId: user._id });

      // Get department info from first enrollment if available
      let departmentInfo = null;
      const firstEnrollment = await Enrollment.findOne({ learnerId: user._id }).populate('programId');
      if (firstEnrollment && firstEnrollment.programId) {
        const program = firstEnrollment.programId as any;
        const department = await Department.findById(program.departmentId);
        if (department) {
          departmentInfo = {
            id: department._id.toString(),
            name: department.name
          };
        }
      }

      // Determine status
      let learnerStatus: 'active' | 'withdrawn' | 'completed' | 'suspended' = 'active';
      if (!user.isActive) {
        learnerStatus = 'suspended';
      }

      learners.push({
        id: user._id.toString(),
        email: user.email,
        firstName: learner.person.firstName,
        lastName: learner.person.lastName,
        studentId: null,
        status: learnerStatus,
        isProgramEnrollee,
        department: departmentInfo,
        programEnrollments,
        courseEnrollments,
        completionRate: 0,
        lastLogin: null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        // Priority for sorting (0 = program enrollee, 1 = other)
        _priority: isProgramEnrollee ? 0 : 1
      });
    }

    // Step 7: Sort by priority (program enrollees first), then by lastName, firstName
    learners.sort((a, b) => {
      if (a._priority !== b._priority) {
        return a._priority - b._priority;
      }
      const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      return (a.firstName || '').localeCompare(b.firstName || '');
    });

    // Step 8: Remove internal _priority field
    learners.forEach(l => delete (l as any)._priority);

    // Step 9: Apply pagination
    const total = learners.length;
    const paginatedLearners = learners.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    // Apply permission-based data masking
    // learner:pii:read → full data with displayName and idSuffix
    // learner:directory:read only → "LastName, F." + idSuffix, no email/PII
    const maskedLearners = viewer ? maskLearnersForViewer(paginatedLearners, viewer) : paginatedLearners;

    return {
      learners: maskedLearners,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Register a new learner account
   */
  static async registerLearner(input: RegisterLearnerInput): Promise<any> {
    // Validate email uniqueness
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    // Validate studentId pattern if provided
    if (input.studentId) {
      const studentIdPattern = /^[A-Z0-9-]+$/;
      if (!studentIdPattern.test(input.studentId)) {
        throw ApiError.badRequest('Student ID must contain only uppercase letters, numbers, and hyphens');
      }

      // Check studentId uniqueness (case-insensitive)
      // Since we don't have a studentId field in User/Learner model, we'll skip this check for now
      // In production, this would be stored in metadata or a custom field
    }

    // Validate department exists if provided
    if (input.department) {
      const department = await Department.findById(input.department);
      if (!department || !department.isActive) {
        throw ApiError.badRequest('Invalid or inactive department');
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create User and Learner
    const userId = new mongoose.Types.ObjectId();

    try {
      // Create User
      const user = await User.create({
        _id: userId,
        email: input.email.toLowerCase(),
        password: hashedPassword,
        userTypes: ['learner'],
        isActive: true
      });

      // Create Learner with same _id
      const learner = await Learner.create({
        _id: userId,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        phoneNumber: input.phone,
        address: input.address,
        isActive: true
      });

      // Get department info if provided
      let departmentInfo = null;
      if (input.department) {
        const department = await Department.findById(input.department);
        if (department) {
          departmentInfo = {
            id: department._id.toString(),
            name: department.name
          };
        }
      }

      return {
        learner: {
          id: user._id.toString(),
          email: user.email,
          firstName: learner.person.firstName,
          lastName: learner.person.lastName,
          studentId: input.studentId || null,
          role: 'learner',
          status: 'active',
          department: departmentInfo,
          phone: learner.person.phones?.[0]?.number || null,
          dateOfBirth: learner.person.dateOfBirth || null,
          address: learner.person.addresses?.[0] || null,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      // Cleanup on error
      await User.findByIdAndDelete(userId);
      await Learner.findByIdAndDelete(userId);
      throw error;
    }
  }

  /**
   * Get detailed learner profile by ID
   * Applies FERPA-compliant data masking based on viewer's role
   *
   * @param learnerId - The learner ID to retrieve
   * @param viewer - The user viewing the data (for data masking)
   */
  static async getLearnerById(learnerId: string, viewer: any): Promise<any> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const user = await User.findById(learnerId);
    if (!user || !user.userTypes.includes('learner')) {
      throw ApiError.notFound('Learner not found');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner record not found');
    }

    // Get department info from first program enrollment
    let departmentInfo = null;
    const firstEnrollment = await Enrollment.findOne({ learnerId: user._id }).populate('programId');
    if (firstEnrollment && firstEnrollment.programId) {
      const program = firstEnrollment.programId as any;
      const department = await Department.findById(program.departmentId);
      if (department) {
        departmentInfo = {
          id: department._id.toString(),
          name: department.name,
          code: department.code
        };
      }
    }

    // Get program enrollments
    const programEnrollments = await Enrollment.find({ learnerId: user._id })
      .populate('programId')
      .sort({ enrollmentDate: -1 });

    const programs = [];
    for (const enrollment of programEnrollments) {
      const program = enrollment.programId as any;
      if (program) {
        // Calculate progress based on completed courses
        const programCourses = await ClassEnrollment.countDocuments({
          learnerId: user._id
        });
        const completedProgramCourses = await ClassEnrollment.countDocuments({
          learnerId: user._id,
          status: 'completed'
        });
        const progress = programCourses > 0 ? completedProgramCourses / programCourses : 0;

        programs.push({
          id: enrollment._id.toString(),
          programId: program._id.toString(),
          programName: program.name,
          enrolledAt: enrollment.enrollmentDate,
          status: this.mapEnrollmentStatus(enrollment.status),
          progress
        });
      }
    }

    // Get course enrollments
    const courseEnrollments = await ClassEnrollment.find({ learnerId: user._id })
      .populate('classId')
      .sort({ enrollmentDate: -1 });

    const courses = [];
    for (const enrollment of courseEnrollments) {
      const classDoc = enrollment.classId as any;
      if (classDoc) {
        const course = await Course.findById(classDoc.courseId);
        if (course) {
          courses.push({
            id: enrollment._id.toString(),
            courseId: course._id.toString(),
            courseName: course.name,
            enrolledAt: enrollment.enrollmentDate,
            status: this.mapClassEnrollmentStatus(enrollment.status),
            progress: enrollment.gradePercentage ? enrollment.gradePercentage / 100 : 0,
            score: enrollment.gradePercentage || null
          });
        }
      }
    }

    // Calculate statistics
    const totalProgramEnrollments = programEnrollments.length;
    const totalCourseEnrollments = courseEnrollments.length;
    const completedCourses = courseEnrollments.filter(e => e.status === 'completed').length;
    const inProgressCourses = courseEnrollments.filter(e => e.status === 'active').length;
    const completionRate = totalCourseEnrollments > 0 ? completedCourses / totalCourseEnrollments : 0;

    // Calculate average score
    const gradesArray = courseEnrollments
      .filter(e => e.gradePercentage !== undefined && e.gradePercentage !== null)
      .map(e => e.gradePercentage!);
    const averageScore = gradesArray.length > 0
      ? gradesArray.reduce((sum, grade) => sum + grade, 0) / gradesArray.length
      : 0;

    // Calculate total time spent
    const attempts = await ContentAttempt.find({ learnerId: user._id });
    const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0);

    // Get last activity
    const lastAttempt = await ContentAttempt.findOne({ learnerId: user._id })
      .sort({ lastAccessedAt: -1 });
    const lastActivityAt = lastAttempt?.lastAccessedAt || null;

    // Determine learner status
    let learnerStatus: 'active' | 'withdrawn' | 'completed' | 'suspended' = 'active';
    if (!user.isActive) {
      learnerStatus = 'suspended';
    } else if (programEnrollments.length > 0) {
      const allWithdrawn = programEnrollments.every(e => e.status === 'withdrawn');
      const allCompleted = programEnrollments.every(e => e.status === 'completed' || e.status === 'graduated');

      if (allWithdrawn) {
        learnerStatus = 'withdrawn';
      } else if (allCompleted) {
        learnerStatus = 'completed';
      }
    }

    const learnerData = {
      id: user._id.toString(),
      email: user.email,
      firstName: learner.person.firstName,
      lastName: learner.person.lastName,
      studentId: null, // Would be in metadata
      role: 'learner',
      status: learnerStatus,
      department: departmentInfo,
      phone: learner.person.phones?.[0]?.number || null,
      dateOfBirth: learner.person.dateOfBirth || null,
      address: learner.person.addresses?.[0] || null,
      enrollments: {
        programs,
        courses
      },
      statistics: {
        totalProgramEnrollments,
        totalCourseEnrollments,
        completedCourses,
        inProgressCourses,
        completionRate,
        averageScore,
        totalTimeSpent,
        lastActivityAt
      },
      lastLogin: null, // Would need session tracking
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    // Apply FERPA-compliant data masking based on viewer's role
    return viewer ? maskLastName(learnerData, viewer) : learnerData;
  }

  /**
   * Update learner profile information
   */
  static async updateLearner(learnerId: string, updateData: UpdateLearnerInput): Promise<any> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const user = await User.findById(learnerId);
    if (!user || !user.userTypes.includes('learner')) {
      throw ApiError.notFound('Learner not found');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner record not found');
    }

    // Validate email uniqueness if updating
    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: learnerId }
      });
      if (existingUser) {
        throw ApiError.conflict('Email already in use by another user');
      }
    }

    // Validate studentId pattern if updating
    if (updateData.studentId) {
      const studentIdPattern = /^[A-Z0-9-]+$/;
      if (!studentIdPattern.test(updateData.studentId)) {
        throw ApiError.badRequest('Student ID must contain only uppercase letters, numbers, and hyphens');
      }
    }

    // Validate department exists if updating
    if (updateData.department) {
      const department = await Department.findById(updateData.department);
      if (!department || !department.isActive) {
        throw ApiError.badRequest('Invalid or inactive department');
      }
    }

    // Update User fields
    if (updateData.email) {
      user.email = updateData.email.toLowerCase();
    }
    if (updateData.status === 'active') {
      user.isActive = true;
    } else if (updateData.status === 'suspended') {
      user.isActive = false;
    }
    await user.save();

    // Update Learner fields
    if (updateData.firstName) {
      learner.person.firstName = updateData.firstName;
    }
    if (updateData.lastName) {
      learner.person.lastName = updateData.lastName;
    }
    if (updateData.phone !== undefined) {
      // Update primary phone or add new one
      const primaryPhoneIndex = learner.person.phones.findIndex(p => p.isPrimary);
      if (primaryPhoneIndex >= 0) {
        learner.person.phones[primaryPhoneIndex].number = updateData.phone;
      } else if (updateData.phone) {
        learner.person.phones.push({
          number: updateData.phone,
          type: 'mobile',
          isPrimary: true,
          verified: false,
          allowSMS: true
        });
      }
    }
    if (updateData.dateOfBirth !== undefined) {
      learner.person.dateOfBirth = updateData.dateOfBirth;
    }
    if (updateData.address) {
      // Merge address fields - update primary address or add new one
      const primaryAddressIndex = learner.person.addresses.findIndex(a => a.isPrimary);
      if (primaryAddressIndex >= 0) {
        const existingAddress = learner.person.addresses[primaryAddressIndex];
        learner.person.addresses[primaryAddressIndex] = {
          street1: updateData.address.street || existingAddress.street1,
          city: updateData.address.city || existingAddress.city,
          state: updateData.address.state || existingAddress.state,
          postalCode: updateData.address.zipCode || existingAddress.postalCode,
          country: updateData.address.country || existingAddress.country,
          type: existingAddress.type,
          isPrimary: true
        };
      } else if (updateData.address.street || updateData.address.city) {
        learner.person.addresses.push({
          street1: updateData.address.street || '',
          city: updateData.address.city || '',
          state: updateData.address.state || '',
          postalCode: updateData.address.zipCode || '',
          country: updateData.address.country || 'US',
          type: 'home',
          isPrimary: true
        });
      }
    }
    await learner.save();

    // Get department info
    let departmentInfo = null;
    if (updateData.department) {
      const department = await Department.findById(updateData.department);
      if (department) {
        departmentInfo = {
          id: department._id.toString(),
          name: department.name
        };
      }
    } else {
      // Get from existing enrollment
      const firstEnrollment = await Enrollment.findOne({ learnerId: user._id }).populate('programId');
      if (firstEnrollment && firstEnrollment.programId) {
        const program = firstEnrollment.programId as any;
        const department = await Department.findById(program.departmentId);
        if (department) {
          departmentInfo = {
            id: department._id.toString(),
            name: department.name
          };
        }
      }
    }

    return {
      learner: {
        id: user._id.toString(),
        email: user.email,
        firstName: learner.person.firstName,
        lastName: learner.person.lastName,
        studentId: updateData.studentId || null,
        role: 'learner',
        status: user.isActive ? 'active' : 'suspended',
        department: departmentInfo,
        phone: learner.person.phones?.[0]?.number || null,
        dateOfBirth: learner.person.dateOfBirth || null,
        address: learner.person.addresses?.[0] || null,
        updatedAt: user.updatedAt
      }
    };
  }

  /**
   * Soft delete learner account (sets status to withdrawn)
   */
  static async deleteLearner(learnerId: string, reason?: string): Promise<any> {
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(learnerId)) {
      throw ApiError.badRequest('Invalid learner ID');
    }

    const user = await User.findById(learnerId);
    if (!user || !user.userTypes.includes('learner')) {
      throw ApiError.notFound('Learner not found');
    }

    const learner = await Learner.findById(learnerId);
    if (!learner) {
      throw ApiError.notFound('Learner record not found');
    }

    // Check if already withdrawn
    const allEnrollments = await Enrollment.find({ learnerId: user._id });
    const allWithdrawn = allEnrollments.every(e => e.status === 'withdrawn');

    if (!user.isActive && allWithdrawn && allEnrollments.length > 0) {
      throw ApiError.conflict('Learner already withdrawn');
    }

    // Set user to inactive
    user.isActive = false;
    await user.save();

    // Set learner to inactive
    learner.isActive = false;
    await learner.save();

    // Withdraw all active program enrollments
    await Enrollment.updateMany(
      {
        learnerId: user._id,
        status: { $in: ['pending', 'active'] }
      },
      {
        status: 'withdrawn',
        withdrawalDate: new Date(),
        withdrawalReason: reason || 'Account withdrawn by admin'
      }
    );

    // Withdraw all active course enrollments
    await ClassEnrollment.updateMany(
      {
        learnerId: user._id,
        status: { $in: ['enrolled', 'active'] }
      },
      {
        status: 'withdrawn',
        dropDate: new Date(),
        dropReason: reason || 'Account withdrawn by admin'
      }
    );

    const deletedAt = new Date();

    return {
      id: user._id.toString(),
      status: 'withdrawn',
      deletedAt
    };
  }

  // Helper methods
  private static mapEnrollmentStatus(status: string): 'active' | 'completed' | 'withdrawn' {
    const statusMap: Record<string, 'active' | 'completed' | 'withdrawn'> = {
      'pending': 'active',
      'active': 'active',
      'completed': 'completed',
      'graduated': 'completed',
      'withdrawn': 'withdrawn',
      'suspended': 'active'
    };
    return statusMap[status] || 'active';
  }

  private static mapClassEnrollmentStatus(status: string): 'active' | 'completed' | 'withdrawn' {
    const statusMap: Record<string, 'active' | 'completed' | 'withdrawn'> = {
      'enrolled': 'active',
      'active': 'active',
      'completed': 'completed',
      'withdrawn': 'withdrawn',
      'dropped': 'withdrawn',
      'failed': 'completed'
    };
    return statusMap[status] || 'active';
  }
}
