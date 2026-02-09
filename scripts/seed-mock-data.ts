/**
 * Mock Data Seeding Script (Current LMS V2 Schema)
 *
 * Populates a disposable mock database with realistic data for development.
 * Uses ENV_FILE to switch between .env and .env.mock.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { loadEnv } from './utils/load-env';
import { seedLookupValues } from './seeds/constants.seed';
import {
  createAdminLearner,
  createAdminStaff,
  createAdminUser,
  createGlobalAdmin,
  createMasterDepartment,
  seedAccessRights,
  seedRoleDefinitions
} from './seed-admin';
import { seedCognitiveDepthLevels } from './seed-cognitive-depth-levels';

import { User } from '../src/models/auth/User.model';
import { Staff } from '../src/models/auth/Staff.model';
import { Learner } from '../src/models/auth/Learner.model';
import Department from '../src/models/organization/Department.model';
import AcademicYear from '../src/models/academic/AcademicYear.model';
import Course from '../src/models/academic/Course.model';
import Program from '../src/models/academic/Program.model';
import Class from '../src/models/academic/Class.model';
import Content from '../src/models/content/Content.model';
import CourseContent from '../src/models/content/CourseContent.model';
import Question from '../src/models/assessment/Question.model';
import QuestionBank from '../src/models/assessment/QuestionBank.model';
import Enrollment from '../src/models/enrollment/Enrollment.model';
import ClassEnrollment from '../src/models/enrollment/ClassEnrollment.model';
import ContentAttempt from '../src/models/content/ContentAttempt.model';
import LearningEvent from '../src/models/activity/LearningEvent.model';
import ExamResult from '../src/models/activity/ExamResult.model';
import ScormAttempt from '../src/models/activity/ScormAttempt.model';
import CanonicalCourse from '../src/models/academic/CanonicalCourse.model';
import CourseVersion from '../src/models/academic/CourseVersion.model';
import CourseVersionModule from '../src/models/academic/CourseVersionModule.model';
import Module from '../src/models/academic/Module.model';
import LearningUnit from '../src/models/content/LearningUnit.model';
import LearningUnitQuestion from '../src/models/content/LearningUnitQuestion.model';

loadEnv();

const DB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MOCK_DB_URI ||
  'mongodb://localhost:27017/lms_mock';

const DEFAULT_PASSWORD = process.env.MOCK_USER_PASSWORD || 'Password123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lms.edu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const randomDateWithinDays = (daysBack: number) => {
  const now = Date.now();
  const offset = randomInt(0, daysBack) * 24 * 60 * 60 * 1000;
  return new Date(now - offset);
};

const buildPerson = (firstName: string, lastName: string, email: string) => ({
  firstName,
  lastName,
  emails: [
    {
      email,
      type: 'institutional',
      isPrimary: true,
      verified: true,
      allowNotifications: true
    }
  ],
  phones: [],
  addresses: [],
  timezone: 'America/New_York',
  languagePreference: 'en'
});

async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log(`Connected to database: ${DB_URI}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

async function dropLegacyIndexes() {
  try {
    const staffIndexes = await Staff.collection.indexes();
    if (staffIndexes.some(index => index.name === 'instructorId_1')) {
      await Staff.collection.dropIndex('instructorId_1');
      console.log('Dropped legacy staff index: instructorId_1');
    }
  } catch (error) {
    console.log('Skipping staff legacy index check:', error);
  }

  try {
    const learnerIndexes = await Learner.collection.indexes();
    if (learnerIndexes.some(index => index.name === 'studentId_1')) {
      await Learner.collection.dropIndex('studentId_1');
      console.log('Dropped legacy learner index: studentId_1');
    }
    if (learnerIndexes.some(index => index.name === 'learnerId_1')) {
      await Learner.collection.dropIndex('learnerId_1');
      console.log('Dropped legacy learner index: learnerId_1');
    }
  } catch (error) {
    console.log('Skipping learner legacy index check:', error);
  }

  try {
    const courseContentIndexes = await CourseContent.collection.indexes();
    if (courseContentIndexes.some(index => index.name === 'course_1_order_1')) {
      await CourseContent.collection.dropIndex('course_1_order_1');
      console.log('Dropped legacy course content index: course_1_order_1');
    }
  } catch (error) {
    console.log('Skipping course content legacy index check:', error);
  }

  try {
    const classEnrollmentIndexes = await ClassEnrollment.collection.indexes();
    if (classEnrollmentIndexes.some(index => index.name === 'learner_1_class_1')) {
      await ClassEnrollment.collection.dropIndex('learner_1_class_1');
      console.log('Dropped legacy class enrollment index: learner_1_class_1');
    }
  } catch (error) {
    console.log('Skipping class enrollment legacy index check:', error);
  }

  try {
    const examResultIndexes = await ExamResult.collection.indexes();
    if (examResultIndexes.some(index => index.name === 'learner_1_exam_1')) {
      await ExamResult.collection.dropIndex('learner_1_exam_1');
      console.log('Dropped legacy exam result index: learner_1_exam_1');
    }
  } catch (error) {
    console.log('Skipping exam result legacy index check:', error);
  }
}

async function ensureDepartment(data: {
  name: string;
  code: string;
  description?: string;
  parentDepartmentId?: mongoose.Types.ObjectId | null;
  isVisible?: boolean;
  requireExplicitMembership?: boolean;
}): Promise<any> {
  const existing = await Department.findOne({ code: data.code.toUpperCase() });
  if (existing) {
    existing.name = data.name;
    existing.description = data.description;
    existing.parentDepartmentId = data.parentDepartmentId || undefined;
    if (typeof data.isVisible === 'boolean') {
      existing.isVisible = data.isVisible;
    }
    if (typeof data.requireExplicitMembership === 'boolean') {
      existing.requireExplicitMembership = data.requireExplicitMembership;
    }
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  const department = new Department({
    name: data.name,
    code: data.code,
    description: data.description,
    parentDepartmentId: data.parentDepartmentId || undefined,
    isVisible: data.isVisible ?? true,
    requireExplicitMembership: data.requireExplicitMembership ?? false,
    isActive: true
  });

  await department.save();
  return department;
}

async function ensureUser(data: {
  email: string;
  userTypes: Array<'learner' | 'staff' | 'global-admin'>;
  passwordHash: string;
}): Promise<any> {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    existing.userTypes = data.userTypes;
    existing.password = data.passwordHash;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return User.create({
    email: data.email,
    password: data.passwordHash,
    userTypes: data.userTypes,
    isActive: true
  });
}

async function ensureStaffRecord(data: {
  userId: mongoose.Types.ObjectId;
  person: any;
  title?: string;
  memberships: Array<{
    departmentId: mongoose.Types.ObjectId;
    roles: string[];
    isPrimary: boolean;
  }>;
}): Promise<any> {
  const existing = await Staff.findById(data.userId);
  if (existing) {
    existing.person = data.person;
    existing.title = data.title;
    existing.departmentMemberships = data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    }));
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Staff.create({
    _id: data.userId,
    person: data.person,
    title: data.title,
    departmentMemberships: data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    })),
    isActive: true
  });
}

async function ensureLearnerRecord(data: {
  userId: mongoose.Types.ObjectId;
  person: any;
  personExtended?: any;
  memberships: Array<{
    departmentId: mongoose.Types.ObjectId;
    roles: string[];
    isPrimary: boolean;
  }>;
}): Promise<any> {
  const existing = await Learner.findById(data.userId);
  if (existing) {
    existing.person = data.person;
    existing.personExtended = data.personExtended;
    existing.departmentMemberships = data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    }));
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Learner.create({
    _id: data.userId,
    person: data.person,
    personExtended: data.personExtended,
    departmentMemberships: data.memberships.map(m => ({
      ...m,
      isActive: true,
      joinedAt: new Date()
    })),
    isActive: true
  });
}

async function ensureAcademicYear(): Promise<any> {
  const existing = await AcademicYear.findOne({ name: '2025-2026' });
  if (existing) {
    existing.startDate = new Date('2025-09-01');
    existing.endDate = new Date('2026-06-30');
    existing.isCurrent = true;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return AcademicYear.create({
    name: '2025-2026',
    startDate: new Date('2025-09-01'),
    endDate: new Date('2026-06-30'),
    isCurrent: true,
    isActive: true
  });
}

async function ensureCourse(data: {
  name: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  credits: number;
  prerequisites?: mongoose.Types.ObjectId[];
  status?: 'draft' | 'published' | 'archived';
  createdBy?: mongoose.Types.ObjectId;
}): Promise<any> {
  const existing = await Course.findOne({
    departmentId: data.departmentId,
    code: data.code
  });

  if (existing) {
    existing.name = data.name;
    existing.credits = data.credits;
    existing.prerequisites = data.prerequisites || [];
    existing.status = data.status || 'published';
    existing.createdBy = data.createdBy;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Course.create({
    name: data.name,
    code: data.code,
    departmentId: data.departmentId,
    credits: data.credits,
    prerequisites: data.prerequisites || [],
    status: data.status || 'published',
    createdBy: data.createdBy,
    isActive: true
  });
}

async function ensureProgram(data: {
  name: string;
  code: string;
  departmentId: mongoose.Types.ObjectId;
  type: 'certificate' | 'continuing-education';
}): Promise<any> {
  const existing = await Program.findOne({
    departmentId: data.departmentId,
    code: data.code
  });

  if (existing) {
    existing.name = data.name;
    existing.type = data.type;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  const program = new Program({
    name: data.name,
    code: data.code,
    departmentId: data.departmentId,
    type: data.type,
    isActive: true
  });

  await program.save();
  return program;
}

async function ensureClass(data: {
  name: string;
  courseId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  termCode: string;
  startDate: Date;
  endDate: Date;
  instructorIds: mongoose.Types.ObjectId[];
  maxEnrollment: number;
}): Promise<any> {
  const existing = await Class.findOne({
    courseId: data.courseId,
    academicYearId: data.academicYearId,
    termCode: data.termCode
  });

  if (existing) {
    existing.name = data.name;
    existing.startDate = data.startDate;
    existing.endDate = data.endDate;
    existing.instructorIds = data.instructorIds;
    existing.maxEnrollment = data.maxEnrollment;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Class.create({
    name: data.name,
    courseId: data.courseId,
    academicYearId: data.academicYearId,
    termCode: data.termCode,
    startDate: data.startDate,
    endDate: data.endDate,
    instructorIds: data.instructorIds,
    maxEnrollment: data.maxEnrollment,
    currentEnrollment: 0,
    isActive: true
  });
}

async function ensureContent(data: {
  title: string;
  description?: string;
  type: 'video' | 'quiz' | 'scorm' | 'document';
  courseId: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
}): Promise<any> {
  const existing = await Content.findOne({ title: data.title });
  if (existing) {
    existing.description = data.description;
    existing.type = data.type;
    existing.createdBy = data.createdBy;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return Content.create({
    title: data.title,
    description: data.description,
    type: data.type,
    fileUrl: `https://cdn.example.com/content/${data.courseId.toString()}/${data.type}`,
    mimeType: data.type === 'document' ? 'application/pdf' : undefined,
    fileSize: data.type === 'document' ? randomInt(500000, 4000000) : undefined,
    duration: data.type === 'video' ? randomInt(20, 60) : undefined,
    quizData:
      data.type === 'quiz'
        ? {
            passingScore: 70,
            timeLimit: 30,
            randomizeQuestions: true,
            showCorrectAnswers: true
          }
        : undefined,
    scormData:
      data.type === 'scorm'
        ? {
            version: '1.2',
            manifestPath: 'imsmanifest.xml',
            launchPath: 'index.html',
            masteryScore: 80
          }
        : undefined,
    createdBy: data.createdBy,
    isActive: true
  });
}

async function ensureCourseContent(data: {
  courseId: mongoose.Types.ObjectId;
  contentId: mongoose.Types.ObjectId;
  sequence: number;
  moduleNumber?: number;
  isRequired?: boolean;
}): Promise<any> {
  const existing = await CourseContent.findOne({
    courseId: data.courseId,
    contentId: data.contentId
  });

  if (existing) {
    existing.sequence = data.sequence;
    existing.moduleNumber = data.moduleNumber;
    existing.isRequired = data.isRequired ?? false;
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return CourseContent.create({
    courseId: data.courseId,
    contentId: data.contentId,
    sequence: data.sequence,
    moduleNumber: data.moduleNumber,
    isRequired: data.isRequired ?? false,
    isActive: true
  });
}

async function ensureQuestionBank(data: {
  name: string;
  description?: string;
  departmentId: mongoose.Types.ObjectId;
  tags?: string[];
}): Promise<any> {
  const existing = await QuestionBank.findOne({ name: data.name });
  if (existing) {
    existing.description = data.description;
    existing.departmentId = data.departmentId;
    existing.tags = data.tags || [];
    existing.isActive = true;
    await existing.save();
    return existing;
  }

  return QuestionBank.create({
    name: data.name,
    description: data.description,
    departmentId: data.departmentId,
    tags: data.tags || [],
    questionIds: [],
    isActive: true
  });
}

async function ensureEnrollment(data: {
  learnerId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  status: 'active' | 'pending';
}): Promise<any> {
  const existing = await Enrollment.findOne({
    learnerId: data.learnerId,
    programId: data.programId,
    academicYearId: data.academicYearId
  });

  if (existing) {
    existing.status = data.status;
    existing.enrollmentDate = new Date();
    await existing.save();
    return existing;
  }

  return Enrollment.create({
    learnerId: data.learnerId,
    programId: data.programId,
    academicYearId: data.academicYearId,
    status: data.status,
    enrollmentDate: new Date(),
    startDate: new Date(),
    totalCreditsEarned: 0
  });
}

async function ensureClassEnrollment(data: {
  learnerId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  status: 'enrolled' | 'active';
}): Promise<any> {
  const existing = await ClassEnrollment.findOne({
    learnerId: data.learnerId,
    classId: data.classId
  });

  if (existing) {
    existing.status = data.status;
    existing.enrollmentDate = new Date();
    await existing.save();
    return existing;
  }

  return ClassEnrollment.create({
    learnerId: data.learnerId,
    classId: data.classId,
    status: data.status,
    enrollmentDate: new Date()
  });
}

/**
 * CBT Question Data - 20 questions on Cognitive Behavioral Therapy
 */
const CBT_QUESTIONS = [
  {
    questionText: 'What is the core principle of Cognitive Behavioral Therapy (CBT)?',
    correctAnswers: ['Thoughts, feelings, and behaviors are interconnected'],
    distractors: ['Unconscious conflicts drive behavior', 'Only behavior change matters', 'Medication is the primary treatment'],
    flashcardPrompt: 'What is the core principle of CBT?',
    matchingPair: { term: 'CBT Core Principle', definition: 'Thoughts, feelings, and behaviors are interconnected' },
    explanation: 'CBT is based on the cognitive model which proposes that the way we perceive situations influences how we feel and behave.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is "cognitive restructuring" in CBT?',
    correctAnswers: ['A technique to identify and challenge negative thought patterns'],
    distractors: ['Rewiring brain neurons', 'Memory enhancement therapy', 'Restructuring the therapeutic relationship'],
    flashcardPrompt: 'Define cognitive restructuring',
    matchingPair: { term: 'Cognitive Restructuring', definition: 'Identifying and challenging negative thought patterns' },
    explanation: 'Cognitive restructuring helps clients recognize distorted thinking and replace it with more balanced thoughts.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is an "automatic thought" in CBT terminology?',
    correctAnswers: ['A spontaneous thought that occurs in response to situations'],
    distractors: ['A thought that happens during sleep', 'A consciously planned thought', 'A thought implanted by the therapist'],
    flashcardPrompt: 'What are automatic thoughts?',
    matchingPair: { term: 'Automatic Thought', definition: 'Spontaneous thoughts occurring in response to situations' },
    explanation: 'Automatic thoughts are quick, evaluative thoughts that occur without deliberate effort.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'Which cognitive distortion involves expecting the worst possible outcome?',
    correctAnswers: ['Catastrophizing'],
    distractors: ['Mind reading', 'Emotional reasoning', 'Personalization'],
    flashcardPrompt: 'Name the distortion: expecting the worst outcome',
    matchingPair: { term: 'Catastrophizing', definition: 'Expecting the worst possible outcome' },
    explanation: 'Catastrophizing is when someone assumes the worst will happen and that they won\'t be able to cope.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is "all-or-nothing thinking" (also called black-and-white thinking)?',
    correctAnswers: ['Seeing things in extreme terms with no middle ground'],
    distractors: ['Balanced perspective taking', 'Flexible thinking style', 'Systematic decision making'],
    flashcardPrompt: 'Define all-or-nothing thinking',
    matchingPair: { term: 'All-or-Nothing Thinking', definition: 'Seeing things in extreme terms with no middle ground' },
    explanation: 'This cognitive distortion involves viewing situations in only two categories without recognizing gray areas.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is the purpose of a "thought record" in CBT?',
    correctAnswers: ['To track and analyze thoughts, emotions, and situations'],
    distractors: ['To record therapy sessions', 'To document medication effects', 'To keep a journal of dreams'],
    flashcardPrompt: 'Purpose of a thought record',
    matchingPair: { term: 'Thought Record', definition: 'Tool for tracking and analyzing thoughts, emotions, and situations' },
    explanation: 'Thought records help clients identify patterns between situations, thoughts, and emotional responses.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What cognitive distortion involves assuming you know what others are thinking?',
    correctAnswers: ['Mind reading'],
    distractors: ['Fortune telling', 'Labeling', 'Overgeneralization'],
    flashcardPrompt: 'Distortion: assuming you know others\' thoughts',
    matchingPair: { term: 'Mind Reading', definition: 'Assuming you know what others are thinking' },
    explanation: 'Mind reading is concluding that someone is reacting negatively without any actual evidence.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is "behavioral activation" used to treat?',
    correctAnswers: ['Depression'],
    distractors: ['Schizophrenia', 'Autism spectrum disorder', 'ADHD'],
    flashcardPrompt: 'What does behavioral activation treat?',
    matchingPair: { term: 'Behavioral Activation', definition: 'CBT technique primarily used to treat depression' },
    explanation: 'Behavioral activation increases engagement in positively reinforcing activities to combat depression.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What does the "Socratic method" involve in CBT?',
    correctAnswers: ['Guided questioning to help clients discover insights'],
    distractors: ['Lecturing clients about their problems', 'Direct advice giving', 'Hypnotic suggestion'],
    flashcardPrompt: 'Describe Socratic method in CBT',
    matchingPair: { term: 'Socratic Method', definition: 'Guided questioning to help clients discover insights' },
    explanation: 'The Socratic method uses questions to promote reflection and help clients examine their thoughts.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What is "exposure therapy" used for in CBT?',
    correctAnswers: ['Anxiety disorders and phobias'],
    distractors: ['Improving memory', 'Treating psychosis', 'Enhancing creativity'],
    flashcardPrompt: 'What is exposure therapy used for?',
    matchingPair: { term: 'Exposure Therapy', definition: 'Treatment for anxiety disorders and phobias' },
    explanation: 'Exposure therapy gradually exposes clients to feared situations to reduce anxiety responses.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is "emotional reasoning" as a cognitive distortion?',
    correctAnswers: ['Believing something is true because it feels true'],
    distractors: ['Using logic to understand emotions', 'Suppressing emotions', 'Expressing emotions freely'],
    flashcardPrompt: 'Define emotional reasoning',
    matchingPair: { term: 'Emotional Reasoning', definition: 'Believing something is true because it feels true' },
    explanation: 'Emotional reasoning occurs when feelings are used as evidence for the truth of a thought.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is a "core belief" in CBT?',
    correctAnswers: ['A fundamental, deeply-held belief about self, others, or the world'],
    distractors: ['A temporary belief', 'A religious conviction', 'A scientific theory'],
    flashcardPrompt: 'What is a core belief?',
    matchingPair: { term: 'Core Belief', definition: 'Fundamental, deeply-held belief about self, others, or the world' },
    explanation: 'Core beliefs are underlying beliefs that influence how we interpret events and form automatic thoughts.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What is "homework" in the context of CBT?',
    correctAnswers: ['Practice assignments between therapy sessions'],
    distractors: ['Academic studying', 'Research on therapy techniques', 'Writing about childhood'],
    flashcardPrompt: 'What is CBT homework?',
    matchingPair: { term: 'CBT Homework', definition: 'Practice assignments between therapy sessions' },
    explanation: 'Homework extends learning outside sessions and is crucial for therapeutic progress.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What cognitive distortion involves using feelings to determine facts?',
    correctAnswers: ['Emotional reasoning'],
    distractors: ['Magnification', 'Discounting the positive', 'Should statements'],
    flashcardPrompt: 'Distortion: using feelings to determine facts',
    matchingPair: { term: 'Emotional Reasoning', definition: 'Using emotional state to determine facts' },
    explanation: 'This distortion assumes that negative emotions necessarily reflect reality.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is the typical duration of short-term CBT treatment?',
    correctAnswers: ['8-20 sessions'],
    distractors: ['1-2 sessions', '50-100 sessions', 'Indefinite treatment'],
    flashcardPrompt: 'Typical CBT treatment duration',
    matchingPair: { term: 'CBT Duration', definition: 'Typically 8-20 sessions for short-term treatment' },
    explanation: 'CBT is a time-limited, structured approach usually completed in 8-20 sessions.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is "overgeneralization" in cognitive distortions?',
    correctAnswers: ['Drawing broad conclusions from a single event'],
    distractors: ['Being too specific', 'Ignoring details', 'Focusing on positives only'],
    flashcardPrompt: 'Define overgeneralization',
    matchingPair: { term: 'Overgeneralization', definition: 'Drawing broad conclusions from a single event' },
    explanation: 'This involves viewing a single negative event as a never-ending pattern of defeat.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'Who is considered the founder of Cognitive Therapy?',
    correctAnswers: ['Aaron Beck'],
    distractors: ['Sigmund Freud', 'Carl Rogers', 'B.F. Skinner'],
    flashcardPrompt: 'Founder of Cognitive Therapy',
    matchingPair: { term: 'Aaron Beck', definition: 'Founder of Cognitive Therapy' },
    explanation: 'Aaron Beck developed cognitive therapy in the 1960s based on his work with depression.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is a "behavioral experiment" in CBT?',
    correctAnswers: ['Testing beliefs through planned activities to gather evidence'],
    distractors: ['Lab research on behavior', 'Animal experiments', 'Drug trials'],
    flashcardPrompt: 'Define behavioral experiment in CBT',
    matchingPair: { term: 'Behavioral Experiment', definition: 'Testing beliefs through planned activities' },
    explanation: 'Behavioral experiments test the validity of thoughts by collecting real-world evidence.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What does "ABC model" stand for in CBT?',
    correctAnswers: ['Activating event, Beliefs, Consequences'],
    distractors: ['Actions, Behaviors, Cognitions', 'Affect, Behavior, Change', 'Assessment, Blueprint, Conclusion'],
    flashcardPrompt: 'What does ABC model stand for?',
    matchingPair: { term: 'ABC Model', definition: 'Activating event, Beliefs, Consequences' },
    explanation: 'The ABC model shows how beliefs about events determine emotional and behavioral consequences.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What is "personalization" as a cognitive distortion?',
    correctAnswers: ['Taking excessive responsibility for external events'],
    distractors: ['Customizing therapy', 'Being impersonal', 'Having a strong personality'],
    flashcardPrompt: 'Define personalization distortion',
    matchingPair: { term: 'Personalization', definition: 'Taking excessive responsibility for external events' },
    explanation: 'Personalization involves blaming yourself for things that are not entirely your fault.',
    difficulty: 'medium' as const
  }
];

/**
 * EMDR Question Data - 15 questions on Eye Movement Desensitization and Reprocessing
 */
const EMDR_QUESTIONS = [
  {
    questionText: 'What does EMDR stand for?',
    correctAnswers: ['Eye Movement Desensitization and Reprocessing'],
    distractors: ['Eye Memory Distortion Recovery', 'Emotional Memory Desensitization Response', 'Eye Movement Diagnostic Rehearsal'],
    flashcardPrompt: 'What does EMDR stand for?',
    matchingPair: { term: 'EMDR', definition: 'Eye Movement Desensitization and Reprocessing' },
    explanation: 'EMDR is Eye Movement Desensitization and Reprocessing, a psychotherapy approach developed by Francine Shapiro.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'How many phases are in the standard EMDR protocol?',
    correctAnswers: ['Eight phases'],
    distractors: ['Four phases', 'Six phases', 'Ten phases'],
    flashcardPrompt: 'How many phases does EMDR have?',
    matchingPair: { term: 'EMDR Protocol', definition: 'Eight-phase treatment approach' },
    explanation: 'The standard EMDR protocol consists of eight phases from history-taking through reevaluation.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is the Adaptive Information Processing (AIP) model?',
    correctAnswers: ['A theoretical model explaining how memories are stored and processed in EMDR'],
    distractors: ['A computer model for data analysis', 'A learning style assessment tool', 'A behavioral conditioning framework'],
    flashcardPrompt: 'Define the AIP model in EMDR',
    matchingPair: { term: 'AIP Model', definition: 'Theoretical model for memory storage and processing in EMDR' },
    explanation: 'The AIP model posits that psychopathology results from unprocessed or maladaptively stored memories.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is bilateral stimulation in EMDR?',
    correctAnswers: ['Alternating stimulation of both sides of the body, typically through eye movements, taps, or tones'],
    distractors: ['Stimulation of only the left hemisphere', 'Electrical brain stimulation', 'Biofeedback monitoring'],
    flashcardPrompt: 'What is bilateral stimulation?',
    matchingPair: { term: 'Bilateral Stimulation', definition: 'Alternating stimulation of both body sides via eye movements, taps, or tones' },
    explanation: 'Bilateral stimulation is the core mechanism of EMDR, facilitating memory reprocessing.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What occurs during the desensitization phase of EMDR?',
    correctAnswers: ['The client focuses on the target memory while experiencing bilateral stimulation until distress decreases'],
    distractors: ['The client avoids thinking about the trauma', 'The therapist provides medication', 'The client practices relaxation only'],
    flashcardPrompt: 'What happens during EMDR desensitization?',
    matchingPair: { term: 'Desensitization Phase', definition: 'Focusing on target memory with bilateral stimulation until distress decreases' },
    explanation: 'Phase 4 (desensitization) aims to reduce the subjective disturbance associated with the target memory.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is the Subjective Units of Disturbance (SUD) scale used for in EMDR?',
    correctAnswers: ['To measure the level of distress associated with a target memory on a 0-10 scale'],
    distractors: ['To measure intelligence', 'To assess medication dosage', 'To rate therapist performance'],
    flashcardPrompt: 'Purpose of the SUD scale in EMDR',
    matchingPair: { term: 'SUD Scale', definition: 'Measures distress level associated with target memory (0-10)' },
    explanation: 'The SUD scale helps track progress during desensitization, with 0 being no disturbance and 10 being worst possible.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is the installation phase in EMDR?',
    correctAnswers: ['Strengthening the positive cognition to replace the negative belief associated with the memory'],
    distractors: ['Installing monitoring software', 'Setting up the therapy room', 'Initial client intake'],
    flashcardPrompt: 'Describe the EMDR installation phase',
    matchingPair: { term: 'Installation Phase', definition: 'Strengthening positive cognition to replace negative belief' },
    explanation: 'Phase 5 strengthens the desired positive cognition using the Validity of Cognition (VOC) scale.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is a negative cognition (NC) in EMDR assessment?',
    correctAnswers: ['A negative self-referencing belief connected to the target memory'],
    distractors: ['A pessimistic worldview', 'A cognitive impairment', 'A therapist judgment'],
    flashcardPrompt: 'What is a negative cognition in EMDR?',
    matchingPair: { term: 'Negative Cognition', definition: 'Negative self-referencing belief connected to target memory' },
    explanation: 'The NC represents the maladaptive belief the client holds about themselves in relation to the traumatic event.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is the body scan phase used for in EMDR?',
    correctAnswers: ['To identify and process any residual physical tension or sensation related to the target memory'],
    distractors: ['Medical imaging', 'Weight measurement', 'Sleep assessment'],
    flashcardPrompt: 'Purpose of body scan in EMDR',
    matchingPair: { term: 'Body Scan Phase', definition: 'Identifying residual physical tension related to target memory' },
    explanation: 'Phase 6 checks for any remaining somatic disturbance that may indicate incomplete processing.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'Who developed EMDR therapy?',
    correctAnswers: ['Francine Shapiro'],
    distractors: ['Aaron Beck', 'Sigmund Freud', 'Carl Rogers'],
    flashcardPrompt: 'Who developed EMDR?',
    matchingPair: { term: 'Francine Shapiro', definition: 'Developer of EMDR therapy' },
    explanation: 'Francine Shapiro developed EMDR in 1987 after noticing that eye movements reduced distressing thoughts.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is a "safe place" exercise in EMDR?',
    correctAnswers: ['A resource development technique where the client imagines a calming, secure environment'],
    distractors: ['A physical safe room', 'An emergency exit plan', 'A sedation procedure'],
    flashcardPrompt: 'Describe the safe place exercise',
    matchingPair: { term: 'Safe Place Exercise', definition: 'Imagining a calming, secure environment for stabilization' },
    explanation: 'The safe place exercise is used in the preparation phase to ensure the client has self-regulation resources.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What conditions is EMDR primarily recommended for treating?',
    correctAnswers: ['Post-traumatic stress disorder (PTSD) and trauma-related conditions'],
    distractors: ['Only depression', 'Only eating disorders', 'Only substance abuse'],
    flashcardPrompt: 'Primary conditions treated with EMDR',
    matchingPair: { term: 'EMDR Indications', definition: 'Primarily recommended for PTSD and trauma-related conditions' },
    explanation: 'EMDR has the strongest evidence base for PTSD and is recommended by WHO and APA guidelines.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is the Validity of Cognition (VOC) scale?',
    correctAnswers: ['A 1-7 scale measuring how true a positive cognition feels to the client'],
    distractors: ['A measure of IQ', 'A test of memory accuracy', 'A scale for medication effectiveness'],
    flashcardPrompt: 'What does the VOC scale measure?',
    matchingPair: { term: 'VOC Scale', definition: 'Measures how true a positive cognition feels (1-7)' },
    explanation: 'The VOC is used during assessment and installation phases, with 7 being completely true.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What is "floatback" technique in EMDR?',
    correctAnswers: ['A technique to identify earlier memories connected to the current disturbance'],
    distractors: ['A relaxation position', 'A type of bilateral stimulation', 'A post-session review'],
    flashcardPrompt: 'Define floatback technique',
    matchingPair: { term: 'Floatback', definition: 'Identifying earlier memories connected to current disturbance' },
    explanation: 'Floatback helps trace current symptoms to their earliest memory origin for targeted processing.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What are contraindications for starting EMDR processing?',
    correctAnswers: ['Insufficient stabilization, active psychosis, or inability to manage emotional distress'],
    distractors: ['Having a headache', 'Being over age 50', 'Having prior therapy experience'],
    flashcardPrompt: 'EMDR contraindications',
    matchingPair: { term: 'EMDR Contraindications', definition: 'Insufficient stabilization, active psychosis, inability to manage distress' },
    explanation: 'EMDR requires adequate client preparation and stabilization before trauma processing begins.',
    difficulty: 'hard' as const
  }
];

/**
 * Cognitive Therapy Question Data - 15 questions on Cognitive Therapy assessment and interventions
 */
const COGNITIVE_THERAPY_QUESTIONS = [
  {
    questionText: 'What is the Beck Depression Inventory (BDI)?',
    correctAnswers: ['A self-report questionnaire measuring severity of depression symptoms'],
    distractors: ['A therapist observation tool', 'A brain imaging technique', 'A medication guide'],
    flashcardPrompt: 'What is the BDI?',
    matchingPair: { term: 'Beck Depression Inventory', definition: 'Self-report questionnaire measuring depression severity' },
    explanation: 'The BDI is one of the most widely used instruments for measuring depression severity.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is cognitive case formulation?',
    correctAnswers: ['A structured framework for understanding a client\'s problems through cognitive theory'],
    distractors: ['A legal case review', 'A pharmaceutical study design', 'A billing procedure'],
    flashcardPrompt: 'Define cognitive case formulation',
    matchingPair: { term: 'Case Formulation', definition: 'Structured framework understanding problems through cognitive theory' },
    explanation: 'Case formulation organizes client information into a cognitive model to guide treatment planning.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is schema therapy?',
    correctAnswers: ['An approach targeting deep-rooted maladaptive patterns (schemas) developed in childhood'],
    distractors: ['A database design method', 'A quick-fix therapy', 'A medication protocol'],
    flashcardPrompt: 'Define schema therapy',
    matchingPair: { term: 'Schema Therapy', definition: 'Targeting deep-rooted maladaptive patterns from childhood' },
    explanation: 'Schema therapy integrates cognitive, behavioral, and experiential techniques to address early maladaptive schemas.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is Socratic questioning in cognitive therapy?',
    correctAnswers: ['A method of guided discovery using questions to help clients examine their own thinking'],
    distractors: ['Asking trivia questions', 'Interrogating the client', 'Reading from a script'],
    flashcardPrompt: 'Define Socratic questioning',
    matchingPair: { term: 'Socratic Questioning', definition: 'Guided discovery using questions to examine thinking' },
    explanation: 'Socratic questioning helps clients discover inconsistencies and develop more balanced perspectives.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is a thought record used for in cognitive therapy?',
    correctAnswers: ['Systematically identifying, evaluating, and modifying automatic thoughts'],
    distractors: ['Recording therapy sessions', 'Documenting medications', 'Tracking appointment attendance'],
    flashcardPrompt: 'Purpose of a thought record',
    matchingPair: { term: 'Thought Record', definition: 'Systematically identifying, evaluating, and modifying automatic thoughts' },
    explanation: 'Thought records help clients see the relationship between situations, thoughts, emotions, and behaviors.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is a behavioral experiment in cognitive therapy?',
    correctAnswers: ['A planned experiential activity designed to test the validity of a belief'],
    distractors: ['A laboratory experiment', 'A drug trial', 'A survey study'],
    flashcardPrompt: 'What is a behavioral experiment?',
    matchingPair: { term: 'Behavioral Experiment', definition: 'Planned activity to test the validity of a belief' },
    explanation: 'Behavioral experiments provide direct evidence that can confirm or disconfirm cognitive distortions.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is the downward arrow technique?',
    correctAnswers: ['A technique to uncover deeper beliefs by repeatedly asking "What does that mean about you?"'],
    distractors: ['A relaxation exercise', 'A drawing technique', 'A grading method'],
    flashcardPrompt: 'Describe the downward arrow technique',
    matchingPair: { term: 'Downward Arrow', definition: 'Uncovering deeper beliefs by asking "What does that mean about you?"' },
    explanation: 'This technique helps identify intermediate and core beliefs underlying automatic thoughts.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What are intermediate beliefs in cognitive therapy?',
    correctAnswers: ['Rules, attitudes, and assumptions that bridge automatic thoughts and core beliefs'],
    distractors: ['Average-difficulty problems', 'Mid-session check-ins', 'Moderately effective interventions'],
    flashcardPrompt: 'Define intermediate beliefs',
    matchingPair: { term: 'Intermediate Beliefs', definition: 'Rules, attitudes, assumptions bridging automatic thoughts and core beliefs' },
    explanation: 'Intermediate beliefs often take the form of "If...then" rules or "should" statements.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What is the Beck Anxiety Inventory (BAI)?',
    correctAnswers: ['A self-report measure distinguishing anxiety symptoms from depression symptoms'],
    distractors: ['A diagnostic brain scan', 'A blood test for anxiety', 'A therapist rating scale'],
    flashcardPrompt: 'What does the BAI measure?',
    matchingPair: { term: 'Beck Anxiety Inventory', definition: 'Self-report measure distinguishing anxiety from depression symptoms' },
    explanation: 'The BAI focuses on somatic symptoms of anxiety to differentiate it from depression.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is cognitive restructuring?',
    correctAnswers: ['The process of identifying, challenging, and modifying maladaptive thoughts'],
    distractors: ['Brain surgery', 'Memory erasure', 'Personality change through medication'],
    flashcardPrompt: 'Define cognitive restructuring',
    matchingPair: { term: 'Cognitive Restructuring', definition: 'Identifying, challenging, and modifying maladaptive thoughts' },
    explanation: 'Cognitive restructuring is a core technique for replacing distorted thinking with more balanced alternatives.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is activity scheduling in cognitive therapy?',
    correctAnswers: ['Planning specific activities to counteract avoidance and increase engagement'],
    distractors: ['Scheduling therapy appointments', 'Creating a study timetable', 'Organizing a work calendar'],
    flashcardPrompt: 'What is activity scheduling?',
    matchingPair: { term: 'Activity Scheduling', definition: 'Planning activities to counteract avoidance and increase engagement' },
    explanation: 'Activity scheduling helps break the cycle of inactivity and low mood in depression.',
    difficulty: 'easy' as const
  },
  {
    questionText: 'What is the cognitive triad in Beck\'s model?',
    correctAnswers: ['Negative views of self, world, and future'],
    distractors: ['Three types of medication', 'Three therapy sessions', 'Three assessment tools'],
    flashcardPrompt: 'What is Beck\'s cognitive triad?',
    matchingPair: { term: 'Cognitive Triad', definition: 'Negative views of self, world, and future' },
    explanation: 'Beck proposed that depression involves negative automatic thoughts about oneself, the world, and the future.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is a "hot thought" in cognitive therapy?',
    correctAnswers: ['The most emotionally charged automatic thought in a given situation'],
    distractors: ['A thought about temperature', 'A trendy idea', 'A therapist\'s opinion'],
    flashcardPrompt: 'Define "hot thought"',
    matchingPair: { term: 'Hot Thought', definition: 'Most emotionally charged automatic thought in a situation' },
    explanation: 'Identifying the hot thought helps focus cognitive restructuring on the most impactful cognition.',
    difficulty: 'medium' as const
  },
  {
    questionText: 'What is the purpose of guided discovery in cognitive therapy?',
    correctAnswers: ['To help clients arrive at new understandings through their own reasoning rather than being told'],
    distractors: ['To lead clients to predetermined answers', 'To discover unconscious memories', 'To find hidden talents'],
    flashcardPrompt: 'Purpose of guided discovery',
    matchingPair: { term: 'Guided Discovery', definition: 'Helping clients reach understandings through their own reasoning' },
    explanation: 'Guided discovery promotes deeper learning by having clients generate their own insights.',
    difficulty: 'hard' as const
  },
  {
    questionText: 'What distinguishes early maladaptive schemas from ordinary beliefs?',
    correctAnswers: ['They are broad, pervasive themes developed early in life that are highly resistant to change'],
    distractors: ['They only form in adulthood', 'They are easy to modify', 'They are always conscious'],
    flashcardPrompt: 'What makes early maladaptive schemas unique?',
    matchingPair: { term: 'Early Maladaptive Schemas', definition: 'Broad, pervasive themes from early life, resistant to change' },
    explanation: 'Early maladaptive schemas serve as templates for processing experience and are self-perpetuating.',
    difficulty: 'hard' as const
  }
];

/**
 * Course content structure definitions for seedCourseContentData
 */
const COURSE_CONTENT_STRUCTURE = {
  EMDR101: {
    modules: [
      {
        title: 'Foundations of EMDR Theory',
        description: 'Introduction to EMDR principles and the Adaptive Information Processing model',
        objectives: ['Explain what EMDR is and its origins', 'Describe the Adaptive Information Processing model', 'Identify the eight phases of EMDR'],
        learningUnits: [
          { title: 'Introduction to EMDR', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'Adaptive Information Processing Model', type: 'document' as const, category: 'topic' as const, contentType: 'document' as const, isRequired: true },
          { title: 'Module 1 Knowledge Check', type: 'assessment' as const, category: 'graded' as const, questionCount: 5, isRequired: true }
        ]
      },
      {
        title: 'The Eight Phases of EMDR',
        description: 'Detailed study of each phase in the EMDR treatment protocol',
        objectives: ['Describe each of the eight EMDR phases', 'Identify appropriate bilateral stimulation techniques', 'Analyze case studies applying EMDR'],
        learningUnits: [
          { title: 'Phase Overview', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'Phase Identification Exercise', type: 'exercise' as const, category: 'practice' as const, questionCount: 4, isRequired: false },
          { title: 'Case Study: EMDR in Trauma', type: 'document' as const, category: 'topic' as const, contentType: 'document' as const, isRequired: true },
          { title: 'Module 2 Quiz', type: 'assessment' as const, category: 'graded' as const, questionCount: 5, isRequired: true }
        ]
      },
      {
        title: 'EMDR Clinical Application',
        description: 'Practical application of EMDR in clinical settings',
        objectives: ['Assess client readiness for EMDR', 'Apply EMDR techniques in clinical scenarios', 'Identify contraindications and safety considerations'],
        learningUnits: [
          { title: 'Client Assessment & Readiness', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'Clinical Scenario Practice', type: 'exercise' as const, category: 'practice' as const, questionCount: 4, isRequired: false },
          { title: 'EMDR Final Assessment', type: 'assessment' as const, category: 'graded' as const, questionCount: 6, isRequired: true }
        ]
      }
    ]
  },
  CBT101: {
    modules: [
      {
        title: 'Introduction to CBT',
        description: 'Core principles and foundations of Cognitive Behavioral Therapy',
        objectives: ['Explain the cognitive model', 'Identify the relationship between thoughts, feelings, and behaviors', 'Describe the evidence base for CBT'],
        learningUnits: [
          { title: 'The Cognitive Model', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'CBT History and Evidence Base', type: 'document' as const, category: 'topic' as const, contentType: 'document' as const, isRequired: true },
          { title: 'Module 1 Knowledge Check', type: 'assessment' as const, category: 'graded' as const, questionCount: 5, isRequired: true }
        ]
      },
      {
        title: 'Cognitive Distortions',
        description: 'Identifying and understanding common patterns of distorted thinking',
        objectives: ['List common cognitive distortions', 'Recognize distortions in clinical examples', 'Apply cognitive restructuring to distorted thoughts'],
        learningUnits: [
          { title: 'Common Cognitive Distortions', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'Distortion Identification Exercise', type: 'exercise' as const, category: 'practice' as const, questionCount: 4, isRequired: false },
          { title: 'Case Study: Cognitive Restructuring', type: 'document' as const, category: 'topic' as const, contentType: 'document' as const, isRequired: true },
          { title: 'Module 2 Quiz', type: 'assessment' as const, category: 'graded' as const, questionCount: 5, isRequired: true }
        ]
      },
      {
        title: 'CBT Techniques in Practice',
        description: 'Hands-on application of core CBT techniques',
        objectives: ['Use thought records effectively', 'Design behavioral experiments', 'Apply CBT techniques to common presentations'],
        learningUnits: [
          { title: 'Thought Records and Behavioral Experiments', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'Technique Application Exercise', type: 'exercise' as const, category: 'practice' as const, questionCount: 4, isRequired: false },
          { title: 'CBT Final Assessment', type: 'assessment' as const, category: 'graded' as const, questionCount: 6, isRequired: true }
        ]
      }
    ]
  },
  BH101: {
    modules: [
      {
        title: 'Introduction to Behavioral Health',
        description: 'Foundational concepts in behavioral health and the biopsychosocial model',
        objectives: ['Define behavioral health and its scope', 'Explain the biopsychosocial model', 'Identify key behavioral health disciplines'],
        learningUnits: [
          { title: 'What is Behavioral Health?', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'The Biopsychosocial Model', type: 'document' as const, category: 'topic' as const, contentType: 'document' as const, isRequired: true },
          { title: 'Module 1 Knowledge Check', type: 'assessment' as const, category: 'graded' as const, questionCount: 5, isRequired: true }
        ]
      },
      {
        title: 'Assessment and Screening',
        description: 'Clinical assessment methods and screening tools in behavioral health',
        objectives: ['Describe common assessment methods', 'Apply screening tools appropriately', 'Interpret initial assessment findings'],
        learningUnits: [
          { title: 'Clinical Assessment Methods', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'Assessment Tool Practice', type: 'exercise' as const, category: 'practice' as const, questionCount: 4, isRequired: false },
          { title: 'Case Study: Initial Assessment', type: 'document' as const, category: 'topic' as const, contentType: 'document' as const, isRequired: true },
          { title: 'Module 2 Quiz', type: 'assessment' as const, category: 'graded' as const, questionCount: 5, isRequired: true }
        ]
      },
      {
        title: 'Intervention Strategies',
        description: 'Evidence-based intervention approaches in behavioral health',
        objectives: ['Identify evidence-based interventions', 'Plan intervention strategies', 'Evaluate intervention effectiveness'],
        learningUnits: [
          { title: 'Evidence-Based Interventions', type: 'document' as const, category: 'topic' as const, contentType: 'text' as const, isRequired: true },
          { title: 'Intervention Planning Exercise', type: 'exercise' as const, category: 'practice' as const, questionCount: 4, isRequired: false },
          { title: 'BH Final Assessment', type: 'assessment' as const, category: 'graded' as const, questionCount: 6, isRequired: true }
        ]
      }
    ]
  }
};

/**
 * Text content templates for learning units
 */
const TEXT_CONTENT_TEMPLATES: Record<string, { title: string; body: string }> = {
  'Introduction to EMDR': {
    title: 'Introduction to EMDR',
    body: '<h2>What is EMDR?</h2><p>Eye Movement Desensitization and Reprocessing (EMDR) is an integrative psychotherapy approach developed by Francine Shapiro in 1987. It is designed to alleviate the distress associated with traumatic memories.</p><h3>Key Concepts</h3><ul><li>EMDR uses bilateral stimulation (eye movements, taps, or tones) to facilitate memory processing</li><li>The Adaptive Information Processing (AIP) model provides the theoretical foundation</li><li>Treatment follows a structured eight-phase protocol</li></ul><p>EMDR has been extensively researched and is recognized by the WHO, APA, and other organizations as an effective treatment for PTSD.</p>'
  },
  'Phase Overview': {
    title: 'The Eight Phases of EMDR',
    body: '<h2>EMDR Treatment Phases</h2><ol><li><strong>History Taking:</strong> Gathering client history and identifying target memories</li><li><strong>Preparation:</strong> Establishing therapeutic rapport and teaching stabilization techniques</li><li><strong>Assessment:</strong> Identifying target memory components (image, negative cognition, positive cognition, emotions, body sensations)</li><li><strong>Desensitization:</strong> Processing the target memory using bilateral stimulation</li><li><strong>Installation:</strong> Strengthening the positive cognition</li><li><strong>Body Scan:</strong> Checking for residual physical sensations</li><li><strong>Closure:</strong> Ensuring client stability at session end</li><li><strong>Reevaluation:</strong> Reviewing progress at subsequent sessions</li></ol>'
  },
  'Client Assessment & Readiness': {
    title: 'Client Assessment and Readiness for EMDR',
    body: '<h2>Assessing Client Readiness</h2><p>Before beginning EMDR processing, clinicians must assess whether the client has adequate stabilization and resources.</p><h3>Key Assessment Areas</h3><ul><li><strong>Emotional Regulation:</strong> Can the client manage intense emotions?</li><li><strong>Support System:</strong> Does the client have adequate social support?</li><li><strong>Contraindications:</strong> Active psychosis, severe dissociation, or substance dependence may require additional preparation</li><li><strong>Resource Development:</strong> Safe place exercise and other stabilization resources should be established</li></ul><h3>The SUD and VOC Scales</h3><p>The Subjective Units of Disturbance (0-10) and Validity of Cognition (1-7) scales are essential tools for tracking processing progress.</p>'
  },
  'The Cognitive Model': {
    title: 'The Cognitive Model',
    body: '<h2>Understanding the Cognitive Model</h2><p>The cognitive model, developed by Aaron Beck, proposes that our interpretations of events—not the events themselves—determine our emotional and behavioral responses.</p><h3>Core Components</h3><ul><li><strong>Situations:</strong> Events or circumstances that trigger thoughts</li><li><strong>Automatic Thoughts:</strong> Quick, evaluative thoughts that occur spontaneously</li><li><strong>Emotions:</strong> Feelings that arise from our interpretations</li><li><strong>Behaviors:</strong> Actions taken in response to thoughts and emotions</li></ul><h3>Levels of Cognition</h3><p>Beck identified three levels: automatic thoughts (surface level), intermediate beliefs (rules and assumptions), and core beliefs (deep, fundamental beliefs about self, others, and the world).</p>'
  },
  'Common Cognitive Distortions': {
    title: 'Common Cognitive Distortions',
    body: '<h2>Patterns of Distorted Thinking</h2><p>Cognitive distortions are systematic errors in thinking that maintain negative beliefs despite contradictory evidence.</p><h3>Common Distortions</h3><ul><li><strong>All-or-Nothing Thinking:</strong> Seeing things in black-and-white categories</li><li><strong>Catastrophizing:</strong> Expecting the worst possible outcome</li><li><strong>Mind Reading:</strong> Assuming you know what others think</li><li><strong>Emotional Reasoning:</strong> Believing something is true because it feels true</li><li><strong>Overgeneralization:</strong> Drawing broad conclusions from single events</li><li><strong>Personalization:</strong> Taking excessive responsibility for external events</li></ul>'
  },
  'Thought Records and Behavioral Experiments': {
    title: 'Thought Records and Behavioral Experiments',
    body: '<h2>Practical CBT Techniques</h2><h3>Thought Records</h3><p>A thought record is a structured tool for capturing and examining automatic thoughts. Columns typically include:</p><ol><li>Situation</li><li>Automatic Thought</li><li>Emotion (with intensity rating)</li><li>Evidence For the thought</li><li>Evidence Against the thought</li><li>Balanced Alternative Thought</li><li>Outcome (re-rated emotion)</li></ol><h3>Behavioral Experiments</h3><p>Behavioral experiments are planned activities designed to test the validity of beliefs. Steps include:</p><ol><li>Identify the belief to test</li><li>Design an experiment</li><li>Predict the outcome based on the old belief</li><li>Carry out the experiment</li><li>Record what actually happened</li><li>Evaluate what was learned</li></ol>'
  },
  'What is Behavioral Health?': {
    title: 'What is Behavioral Health?',
    body: '<h2>Understanding Behavioral Health</h2><p>Behavioral health encompasses the connection between behaviors and the health and well-being of the body, mind, and spirit. It includes not just mental health but also substance abuse, lifestyle factors, and behavioral patterns.</p><h3>Scope of Behavioral Health</h3><ul><li>Mental health disorders and treatment</li><li>Substance use disorders</li><li>Health behaviors (exercise, diet, sleep)</li><li>Stress management</li><li>Prevention and early intervention</li></ul><h3>The Continuum of Care</h3><p>Behavioral health operates across a continuum from prevention through acute treatment to maintenance and recovery.</p>'
  },
  'Clinical Assessment Methods': {
    title: 'Clinical Assessment Methods',
    body: '<h2>Assessment in Behavioral Health</h2><p>Clinical assessment is the systematic evaluation of a client\'s presenting concerns, history, and functioning to guide treatment planning.</p><h3>Key Components</h3><ul><li><strong>Clinical Interview:</strong> Structured or semi-structured gathering of history</li><li><strong>Standardized Measures:</strong> Validated instruments (BDI, BAI, PHQ-9)</li><li><strong>Behavioral Observation:</strong> Direct observation of client behavior</li><li><strong>Risk Assessment:</strong> Evaluating risk for self-harm or harm to others</li></ul><h3>Biopsychosocial Assessment</h3><p>A comprehensive assessment considers biological factors (medical history, genetics), psychological factors (cognition, emotion, behavior), and social factors (relationships, culture, environment).</p>'
  },
  'Evidence-Based Interventions': {
    title: 'Evidence-Based Interventions',
    body: '<h2>Evidence-Based Intervention Strategies</h2><p>Evidence-based interventions are treatments that have been scientifically tested and shown to produce positive outcomes.</p><h3>Common Approaches</h3><ul><li><strong>Cognitive Behavioral Therapy (CBT):</strong> Targeting thoughts and behaviors</li><li><strong>Motivational Interviewing (MI):</strong> Enhancing motivation for change</li><li><strong>Dialectical Behavior Therapy (DBT):</strong> Skills for emotion regulation</li><li><strong>EMDR:</strong> Processing traumatic memories</li></ul><h3>Treatment Planning</h3><p>Effective treatment planning matches interventions to client needs, considers client preferences, and includes measurable goals with regular progress monitoring.</p>'
  }
};

/**
 * CBT Versioned Course Data - 5 courses with modules
 */
const CBT_COURSES = [
  {
    code: 'CBT-INTRO',
    title: 'Introduction to CBT',
    description: 'A comprehensive introduction to Cognitive Behavioral Therapy principles and techniques.',
    credits: 3,
    duration: 480,
    modules: [
      { title: 'Understanding the Cognitive Model', objectives: ['Explain the CBT cognitive model', 'Identify automatic thoughts'] },
      { title: 'Cognitive Distortions', objectives: ['List common cognitive distortions', 'Recognize distortions in examples'] }
    ]
  },
  {
    code: 'CBT-TECH',
    title: 'CBT Techniques and Interventions',
    description: 'Hands-on training in core CBT intervention techniques.',
    credits: 4,
    duration: 600,
    modules: [
      { title: 'Cognitive Restructuring Techniques', objectives: ['Apply cognitive restructuring', 'Use thought records effectively'] },
      { title: 'Behavioral Interventions', objectives: ['Implement behavioral experiments', 'Design exposure hierarchies'] }
    ]
  },
  {
    code: 'CBT-DEPR',
    title: 'CBT for Depression',
    description: 'Specialized training in applying CBT to treat depressive disorders.',
    credits: 3,
    duration: 540,
    modules: [
      { title: 'Understanding Depression in CBT', objectives: ['Identify depression symptoms', 'Understand the CBT model of depression'] },
      { title: 'Behavioral Activation', objectives: ['Implement behavioral activation', 'Track mood and activity relationships'] }
    ]
  },
  {
    code: 'CBT-ANX',
    title: 'CBT for Anxiety Disorders',
    description: 'Training in CBT approaches to anxiety and related disorders.',
    credits: 4,
    duration: 600,
    modules: [
      { title: 'Anxiety and the Fight-or-Flight Response', objectives: ['Explain anxiety physiology', 'Identify anxiety maintenance cycles'] },
      { title: 'Exposure Therapy Fundamentals', objectives: ['Design exposure hierarchies', 'Conduct exposure sessions safely'] }
    ]
  },
  {
    code: 'CBT-ADV',
    title: 'Advanced CBT Practice',
    description: 'Advanced topics in CBT including working with complex cases and treatment resistance.',
    credits: 5,
    duration: 720,
    modules: [
      { title: 'Core Beliefs and Schemas', objectives: ['Identify core beliefs', 'Work with schema-level cognitions'] },
      { title: 'Complex Cases and Integration', objectives: ['Apply CBT to complex presentations', 'Integrate CBT with other approaches'] }
    ]
  }
];

/**
 * Seeds CBT question bank and versioned courses
 */
async function seedCBTContent(departmentId: mongoose.Types.ObjectId, creatorId: mongoose.Types.ObjectId) {
  console.log('Creating CBT question bank and questions...');

  // Create or get CBT question bank
  let cbtBank = await QuestionBank.findOne({ name: 'CBT Assessment Bank' });
  if (!cbtBank) {
    cbtBank = await QuestionBank.create({
      name: 'CBT Assessment Bank',
      description: 'Comprehensive question bank for Cognitive Behavioral Therapy assessments',
      departmentId,
      tags: ['cbt', 'cognitive-therapy', 'assessment', 'psychology'],
      questionIds: [],
      isActive: true
    });
  }

  // Create 20 CBT questions if they don't exist
  const existingQuestions = await Question.countDocuments({
    questionBankIds: cbtBank._id.toString()
  });

  if (existingQuestions < 20) {
    console.log('Creating 20 CBT questions with flashcard and matching data...');
    const createdQuestionIds: mongoose.Types.ObjectId[] = [];

    for (let i = 0; i < CBT_QUESTIONS.length; i++) {
      const q = CBT_QUESTIONS[i];

      const question = await Question.create({
        questionText: q.questionText,
        questionTypes: ['multiple_choice', 'flashcard', 'matching'],
        departmentId,
        points: 10,
        correctAnswers: q.correctAnswers,
        distractors: q.distractors,
        difficulty: q.difficulty,
        tags: ['cbt', 'cognitive-therapy', `difficulty-${q.difficulty}`],
        questionBankIds: [cbtBank._id.toString()],
        explanation: q.explanation,
        // Flashcard data
        flashcardData: {
          prompts: [
            { text: q.flashcardPrompt }
          ]
        },
        // Matching data
        matchingPairs: {
          [q.matchingPair.term]: q.matchingPair.definition
        },
        matchingData: {
          pairExplanation: q.explanation
        },
        isActive: true
      });

      createdQuestionIds.push(question._id);
    }

    // Update bank with question IDs
    cbtBank.questionIds = createdQuestionIds;
    await cbtBank.save();
    console.log(`Created ${createdQuestionIds.length} CBT questions`);
  } else {
    console.log('CBT questions already exist, skipping...');
  }

  // Create 5 versioned courses
  console.log('Creating 5 CBT versioned courses...');

  for (const courseData of CBT_COURSES) {
    // Check if canonical course exists
    let canonical = await CanonicalCourse.findOne({
      code: courseData.code,
      departmentId
    });

    if (!canonical) {
      // Create canonical course
      canonical = await CanonicalCourse.create({
        code: courseData.code,
        departmentId,
        programId: null,
        currentPublishedVersionId: null,
        latestDraftVersionId: null,
        totalVersions: 0,
        createdBy: creatorId
      });

      // Create version 1
      const version = await CourseVersion.create({
        canonicalCourseId: canonical._id,
        version: 1,
        title: courseData.title,
        description: courseData.description,
        credits: courseData.credits,
        duration: courseData.duration,
        settings: {
          allowSelfEnrollment: true,
          passingScore: 70,
          maxAttempts: 3,
          certificateEnabled: true,
          enforcePrerequisites: true,
          showProgressBar: true,
          allowModuleSkipping: false
        },
        instructorIds: [creatorId],
        status: 'published',
        isLocked: false,
        isLatest: true,
        parentVersionId: null,
        createdBy: creatorId,
        publishedAt: new Date(),
        publishedBy: creatorId,
        changeNotes: 'Initial published version'
      });

      // Update canonical with version references
      canonical.currentPublishedVersionId = version._id;
      canonical.latestDraftVersionId = version._id;
      canonical.totalVersions = 1;
      await canonical.save();

      // Create modules for this course
      for (let i = 0; i < courseData.modules.length; i++) {
        const moduleData = courseData.modules[i];

        const module = await Module.create({
          ownerDepartmentId: departmentId,
          isShared: false,
          title: moduleData.title,
          description: `${moduleData.title} for ${courseData.title}`,
          prerequisites: [],
          completionCriteria: {
            type: 'percentage',
            percentageRequired: 80
          },
          presentationRules: {
            presentationMode: 'random',
            repetitionMode: 'until_passed',
            masteryThreshold: 80,
            maxRepetitions: 3,
            repeatOn: {
              failedAttempt: true,
              belowMastery: true,
              learnerRequest: true
            },
            repeatableCategories: [],
            showAllAvailable: true,
            allowSkip: false
          },
          isPublished: true,
          estimatedDuration: 60,
          objectives: moduleData.objectives,
          order: i,
          createdBy: creatorId
        });

        // Link module to course version
        await CourseVersionModule.create({
          courseVersionId: version._id,
          moduleId: module._id,
          order: i,
          isRequired: true,
          availableFrom: null,
          availableUntil: null
        });
      }

      console.log(`Created course: ${courseData.code} (${courseData.title}) with ${courseData.modules.length} modules - PUBLISHED`);
    } else {
      console.log(`Course ${courseData.code} already exists, skipping...`);
    }
  }
}

/**
 * Seeds course content data (LearningUnits, Content, Questions) for EMDR101, CBT101, BH101.
 * Creates the full CanonicalCourse → CourseVersion → Module → CourseVersionModule → LearningUnit chain.
 */
async function seedCourseContentData(
  courses: Record<string, any>,
  departments: Record<string, any>,
  creatorId: mongoose.Types.ObjectId
) {
  console.log('Seeding course content data (LearningUnits) for EMDR101, CBT101, BH101...');

  // Create EMDR question bank + questions
  let emdrBank = await QuestionBank.findOne({ name: 'EMDR Assessment Bank' });
  if (!emdrBank) {
    emdrBank = await QuestionBank.create({
      name: 'EMDR Assessment Bank',
      description: 'Comprehensive question bank for EMDR therapy assessments',
      departmentId: departments.emdr._id,
      tags: ['emdr', 'trauma-therapy', 'assessment'],
      questionIds: [],
      isActive: true
    });
  }

  const existingEmdrQCount = await Question.countDocuments({ questionBankIds: emdrBank._id.toString() });
  const emdrQuestionDocs: any[] = [];
  if (existingEmdrQCount < 15) {
    console.log('  Creating 15 EMDR questions...');
    for (const q of EMDR_QUESTIONS) {
      const question = await Question.create({
        questionText: q.questionText,
        questionTypes: ['multiple_choice', 'flashcard'],
        departmentId: departments.emdr._id,
        points: 10,
        correctAnswers: q.correctAnswers,
        distractors: q.distractors,
        difficulty: q.difficulty,
        tags: ['emdr', `difficulty-${q.difficulty}`],
        questionBankIds: [emdrBank._id.toString()],
        explanation: q.explanation,
        flashcardData: { prompts: [{ text: q.flashcardPrompt }] },
        matchingPairs: { [q.matchingPair.term]: q.matchingPair.definition },
        matchingData: { pairExplanation: q.explanation },
        isActive: true
      });
      emdrQuestionDocs.push(question);
    }
    emdrBank.questionIds = emdrQuestionDocs.map(q => q._id);
    await emdrBank.save();
  } else {
    const existing = await Question.find({ questionBankIds: emdrBank._id.toString() });
    emdrQuestionDocs.push(...existing);
  }

  // Create Cognitive Therapy question bank + questions
  let cogBank = await QuestionBank.findOne({ name: 'Cognitive Therapy Assessment Bank' });
  if (!cogBank) {
    cogBank = await QuestionBank.create({
      name: 'Cognitive Therapy Assessment Bank',
      description: 'Comprehensive question bank for Cognitive Therapy assessments',
      departmentId: departments.cognitive._id,
      tags: ['cognitive-therapy', 'assessment', 'psychology'],
      questionIds: [],
      isActive: true
    });
  }

  const existingCogQCount = await Question.countDocuments({ questionBankIds: cogBank._id.toString() });
  const cogQuestionDocs: any[] = [];
  if (existingCogQCount < 15) {
    console.log('  Creating 15 Cognitive Therapy questions...');
    for (const q of COGNITIVE_THERAPY_QUESTIONS) {
      const question = await Question.create({
        questionText: q.questionText,
        questionTypes: ['multiple_choice', 'flashcard'],
        departmentId: departments.cognitive._id,
        points: 10,
        correctAnswers: q.correctAnswers,
        distractors: q.distractors,
        difficulty: q.difficulty,
        tags: ['cognitive-therapy', `difficulty-${q.difficulty}`],
        questionBankIds: [cogBank._id.toString()],
        explanation: q.explanation,
        flashcardData: { prompts: [{ text: q.flashcardPrompt }] },
        matchingPairs: { [q.matchingPair.term]: q.matchingPair.definition },
        matchingData: { pairExplanation: q.explanation },
        isActive: true
      });
      cogQuestionDocs.push(question);
    }
    cogBank.questionIds = cogQuestionDocs.map(q => q._id);
    await cogBank.save();
  } else {
    const existing = await Question.find({ questionBankIds: cogBank._id.toString() });
    cogQuestionDocs.push(...existing);
  }

  // Map course codes to question banks and questions
  const courseBankMap: Record<string, { bank: any; questions: any[] }> = {
    EMDR101: { bank: emdrBank, questions: emdrQuestionDocs },
    CBT101: { bank: emdrBank, questions: emdrQuestionDocs }, // CBT101 uses CBT_QUESTIONS bank (already seeded), but for LU questions we use the CBT questions
    BH101: { bank: cogBank, questions: cogQuestionDocs }
  };

  // We need to get the existing CBT Assessment Bank questions for CBT101
  const cbtBank = await QuestionBank.findOne({ name: 'CBT Assessment Bank' });
  if (cbtBank) {
    const cbtQuestions = await Question.find({ questionBankIds: cbtBank._id.toString() });
    courseBankMap.CBT101 = { bank: cbtBank, questions: cbtQuestions };
  }

  // Process each target course
  const targetCourses = [
    { code: 'EMDR101', course: courses.EMDR101, departmentId: departments.emdr._id },
    { code: 'CBT101', course: courses.CBT101, departmentId: departments.cbtFundamentals._id },
    { code: 'BH101', course: courses.BH101, departmentId: departments.behavioral._id }
  ];

  for (const target of targetCourses) {
    const structure = COURSE_CONTENT_STRUCTURE[target.code as keyof typeof COURSE_CONTENT_STRUCTURE];
    if (!structure || !target.course) {
      console.log(`  Skipping ${target.code}: course or structure not found`);
      continue;
    }

    // Check if canonical course already exists for this code
    let canonical = await CanonicalCourse.findOne({ code: target.code, departmentId: target.departmentId });
    if (canonical) {
      console.log(`  CanonicalCourse for ${target.code} already exists, skipping...`);
      continue;
    }

    console.log(`  Creating content chain for ${target.code}...`);

    // Create canonical course
    canonical = await CanonicalCourse.create({
      code: target.code,
      departmentId: target.departmentId,
      programId: null,
      currentPublishedVersionId: null,
      latestDraftVersionId: null,
      totalVersions: 0,
      createdBy: creatorId
    });

    // Create course version (published)
    const version = await CourseVersion.create({
      canonicalCourseId: canonical._id,
      version: 1,
      title: target.course.name,
      description: `${target.course.name} — comprehensive course content`,
      credits: target.course.credits,
      duration: 480,
      settings: {
        allowSelfEnrollment: true,
        passingScore: 70,
        maxAttempts: 3,
        certificateEnabled: true,
        enforcePrerequisites: true,
        showProgressBar: true,
        allowModuleSkipping: false
      },
      instructorIds: [creatorId],
      status: 'published',
      isLocked: false,
      isLatest: true,
      parentVersionId: null,
      createdBy: creatorId,
      publishedAt: new Date(),
      publishedBy: creatorId,
      changeNotes: 'Initial published version with learning units'
    });

    // Update canonical with version references
    canonical.currentPublishedVersionId = version._id;
    canonical.latestDraftVersionId = version._id;
    canonical.totalVersions = 1;
    await canonical.save();

    // Track question index for distributing questions across LUs
    let questionIndex = 0;
    const bankInfo = courseBankMap[target.code];

    // Create modules and learning units
    for (let moduleIdx = 0; moduleIdx < structure.modules.length; moduleIdx++) {
      const moduleDef = structure.modules[moduleIdx];

      const module = await Module.create({
        ownerDepartmentId: target.departmentId,
        isShared: false,
        title: moduleDef.title,
        description: moduleDef.description,
        prerequisites: [],
        completionCriteria: {
          type: 'percentage',
          percentageRequired: 80
        },
        presentationRules: {
          presentationMode: 'prescribed',
          repetitionMode: 'until_passed',
          masteryThreshold: 80,
          maxRepetitions: 3,
          repeatOn: {
            failedAttempt: true,
            belowMastery: true,
            learnerRequest: true
          },
          repeatableCategories: [],
          showAllAvailable: false,
          allowSkip: false
        },
        isPublished: true,
        estimatedDuration: 90,
        objectives: moduleDef.objectives,
        order: moduleIdx,
        createdBy: creatorId
      });

      // Link module to course version
      await CourseVersionModule.create({
        courseVersionId: version._id,
        moduleId: module._id,
        order: moduleIdx,
        isRequired: true,
        availableFrom: null,
        availableUntil: null
      });

      // Create learning units for this module
      for (let luIdx = 0; luIdx < moduleDef.learningUnits.length; luIdx++) {
        const luDef = moduleDef.learningUnits[luIdx];

        let contentId: mongoose.Types.ObjectId | undefined;

        // Create Content record for text/document LUs
        if (luDef.type === 'document' && 'contentType' in luDef) {
          const template = TEXT_CONTENT_TEMPLATES[luDef.title];
          const contentData: any = {
            title: `${target.code} - ${moduleDef.title} - ${luDef.title}`,
            description: `${luDef.title} for ${moduleDef.title}`,
            type: luDef.contentType,
            createdBy: creatorId,
            isActive: true
          };

          if (luDef.contentType === 'text' && template) {
            contentData.metadata = { htmlContent: template.body };
          } else if (luDef.contentType === 'document') {
            contentData.fileUrl = `https://cdn.example.com/content/${target.code}/${luDef.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
            contentData.mimeType = 'application/pdf';
            contentData.fileSize = randomInt(500000, 3000000);
          }

          const content = await Content.create(contentData);
          contentId = content._id;
        }

        // Build settings based on type
        let settings: any;
        if (luDef.type === 'assessment') {
          settings = {
            passingScore: 70,
            showFeedback: true,
            shuffleQuestions: true,
            allowMultipleAttempts: true,
            maxAttempts: 3,
            timeLimit: 30
          };
        } else if (luDef.type === 'exercise') {
          settings = {
            passingScore: 70,
            showFeedback: true,
            allowMultipleAttempts: true
          };
        }

        const learningUnit = await LearningUnit.create({
          moduleId: module._id,
          title: luDef.title,
          description: `${luDef.title} for ${moduleDef.title}`,
          type: luDef.type,
          contentId,
          category: luDef.category,
          isRequired: luDef.isRequired,
          isReplayable: luDef.type !== 'assessment',
          weight: luDef.type === 'assessment' ? 30 : luDef.type === 'exercise' ? 15 : 0,
          sequence: luIdx + 1,
          isActive: true,
          settings,
          estimatedDuration: luDef.type === 'document' ? 20 : luDef.type === 'exercise' ? 25 : luDef.type === 'assessment' ? 30 : 15,
          metadata: { seededBy: 'seed-mock-data-course-content' },
          createdBy: creatorId
        });

        // Create LearningUnitQuestion records for assessment/exercise LUs
        if ('questionCount' in luDef && bankInfo && bankInfo.questions.length > 0) {
          const qCount = luDef.questionCount as number;
          for (let qi = 0; qi < qCount; qi++) {
            const qDoc = bankInfo.questions[questionIndex % bankInfo.questions.length];
            await LearningUnitQuestion.create({
              learningUnitId: learningUnit._id,
              questionId: qDoc._id,
              bankId: bankInfo.bank._id,
              sequence: qi
            });
            questionIndex++;
          }
        }
      }

      console.log(`    Created module: ${moduleDef.title} (${moduleDef.learningUnits.length} learning units)`);
    }

    console.log(`  ✓ ${target.code}: ${structure.modules.length} modules with learning units created`);
  }

  console.log('Course content data seeding complete.');
}

async function main() {
  console.log('Mock Data Seed Script (Current LMS V2 Schema)');
  console.log('');

  try {
    await connectDB();
    await dropLegacyIndexes();

    console.log('Seeding lookup values...');
    await seedLookupValues();

    console.log('Seeding access rights and role definitions...');
    await seedAccessRights();
    await seedRoleDefinitions();

    console.log('Seeding cognitive depth levels...');
    await seedCognitiveDepthLevels();

    console.log('Ensuring master department and admin user...');
    await createMasterDepartment();
    const adminUserId = await createAdminUser();
    await createAdminStaff(adminUserId);
    await createAdminLearner(adminUserId);
    await createGlobalAdmin(adminUserId);

    console.log('Creating departments...');
    const masterDept = await Department.findOne({ code: 'MASTER' });
    if (!masterDept) {
      throw new Error('Master department not found after seed.');
    }

    const behavioral = await ensureDepartment({
      name: 'Behavioral Health',
      code: 'BEHAV',
      description: 'Behavioral health training and interventions',
      parentDepartmentId: masterDept._id
    });

    const cognitive = await ensureDepartment({
      name: 'Cognitive Therapy',
      code: 'COG',
      description: 'Cognitive therapy methods and practice',
      parentDepartmentId: masterDept._id
    });

    const emdr = await ensureDepartment({
      name: 'EMDR',
      code: 'EMDR',
      description: 'EMDR therapy techniques and supervision',
      parentDepartmentId: masterDept._id
    });

    const cbtFundamentals = await ensureDepartment({
      name: 'CBT Fundamentals',
      code: 'CBT',
      description: 'Foundations of cognitive behavioral therapy',
      parentDepartmentId: cognitive._id
    });

    const crisis = await ensureDepartment({
      name: 'Crisis Intervention',
      code: 'CRISIS',
      description: 'Crisis response and stabilization',
      parentDepartmentId: behavioral._id
    });

    console.log('Creating staff users...');
    const staffPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const instructorUser = await ensureUser({
      email: 'john.instructor@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const contentUser = await ensureUser({
      email: 'maria.content@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const deptAdminUser = await ensureUser({
      email: 'sam.department@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const leadInstructorUser = await ensureUser({
      email: 'riley.instructor@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const billingUser = await ensureUser({
      email: 'taylor.billing@lms.edu',
      userTypes: ['staff'],
      passwordHash: staffPasswordHash
    });

    const instructorStaff = await ensureStaffRecord({
      userId: instructorUser._id,
      person: buildPerson('John', 'Instructor', instructorUser.email),
      title: 'Senior Instructor',
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['instructor'],
          isPrimary: true
        },
        {
          departmentId: crisis._id,
          roles: ['instructor'],
          isPrimary: false
        }
      ]
    });

    const contentStaff = await ensureStaffRecord({
      userId: contentUser._id,
      person: buildPerson('Maria', 'Content', contentUser.email),
      title: 'Content Lead',
      memberships: [
        {
          departmentId: cognitive._id,
          roles: ['content-admin'],
          isPrimary: true
        }
      ]
    });

    const deptAdminStaff = await ensureStaffRecord({
      userId: deptAdminUser._id,
      person: buildPerson('Sam', 'Department', deptAdminUser.email),
      title: 'Department Manager',
      memberships: [
        {
          departmentId: emdr._id,
          roles: ['department-admin', 'billing-admin'],
          isPrimary: true
        }
      ]
    });

    const leadInstructorStaff = await ensureStaffRecord({
      userId: leadInstructorUser._id,
      person: buildPerson('Riley', 'Instructor', leadInstructorUser.email),
      title: 'Lead Instructor',
      memberships: [
        {
          departmentId: cognitive._id,
          roles: ['instructor', 'content-admin', 'department-admin'],
          isPrimary: true
        },
        {
          departmentId: cbtFundamentals._id,
          roles: ['instructor'],
          isPrimary: false
        }
      ]
    });

    await ensureStaffRecord({
      userId: billingUser._id,
      person: buildPerson('Taylor', 'Billing', billingUser.email),
      title: 'Billing Specialist',
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['billing-admin'],
          isPrimary: true
        }
      ]
    });

    console.log('Creating learner users...');
    const learnerPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const learnerOneUser = await ensureUser({
      email: 'alex.learner@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerTwoUser = await ensureUser({
      email: 'jordan.student@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerThreeUser = await ensureUser({
      email: 'casey.learner@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerFourUser = await ensureUser({
      email: 'jamie.student@lms.edu',
      userTypes: ['learner'],
      passwordHash: learnerPasswordHash
    });

    const learnerOne = await ensureLearnerRecord({
      userId: learnerOneUser._id,
      person: buildPerson('Alex', 'Learner', learnerOneUser.email),
      personExtended: {
        studentId: 'STU-1001',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: cognitive._id,
          roles: ['course-taker'],
          isPrimary: true
        }
      ]
    });

    const learnerTwo = await ensureLearnerRecord({
      userId: learnerTwoUser._id,
      person: buildPerson('Jordan', 'Student', learnerTwoUser.email),
      personExtended: {
        studentId: 'STU-1002',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['auditor'],
          isPrimary: true
        }
      ]
    });

    const learnerThree = await ensureLearnerRecord({
      userId: learnerThreeUser._id,
      person: buildPerson('Casey', 'Learner', learnerThreeUser.email),
      personExtended: {
        studentId: 'STU-1003',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: emdr._id,
          roles: ['course-taker'],
          isPrimary: true
        }
      ]
    });

    const learnerFour = await ensureLearnerRecord({
      userId: learnerFourUser._id,
      person: buildPerson('Jamie', 'Student', learnerFourUser.email),
      personExtended: {
        studentId: 'STU-1004',
        emergencyContacts: [],
        identifications: []
      },
      memberships: [
        {
          departmentId: behavioral._id,
          roles: ['course-taker'],
          isPrimary: true
        }
      ]
    });

    console.log('Creating academic year...');
    const academicYear = await ensureAcademicYear();

    console.log('Creating courses...');
    const courseBH101 = await ensureCourse({
      name: 'Behavioral Health Basics',
      code: 'BH101',
      departmentId: behavioral._id,
      credits: 3
    });

    const courseBH201 = await ensureCourse({
      name: 'Behavioral Health Applied Practice',
      code: 'BH201',
      departmentId: behavioral._id,
      credits: 3,
      prerequisites: [courseBH101._id]
    });

    const courseCBT101 = await ensureCourse({
      name: 'CBT Foundations',
      code: 'CBT101',
      departmentId: cbtFundamentals._id,
      credits: 2
    });

    const courseCBT201 = await ensureCourse({
      name: 'CBT Advanced Skills',
      code: 'CBT201',
      departmentId: cognitive._id,
      credits: 3,
      prerequisites: [courseCBT101._id]
    });

    const courseEMDR101 = await ensureCourse({
      name: 'EMDR Introduction',
      code: 'EMDR101',
      departmentId: emdr._id,
      credits: 3
    });

    const courseEMDR201 = await ensureCourse({
      name: 'EMDR Practicum',
      code: 'EMDR201',
      departmentId: emdr._id,
      credits: 4,
      prerequisites: [courseEMDR101._id]
    });

    // Riley's courses - Cognitive Therapy department
    const courseCOG101 = await ensureCourse({
      name: 'Cognitive Assessment Fundamentals',
      code: 'COG101',
      departmentId: cognitive._id,
      credits: 3,
      createdBy: leadInstructorStaff._id
    });

    const courseCOG201 = await ensureCourse({
      name: 'Advanced Cognitive Interventions',
      code: 'COG201',
      departmentId: cognitive._id,
      credits: 4,
      prerequisites: [courseCOG101._id],
      createdBy: leadInstructorStaff._id
    });

    const courseCOG301 = await ensureCourse({
      name: 'Cognitive Therapy Practicum',
      code: 'COG301',
      departmentId: cognitive._id,
      credits: 4,
      prerequisites: [courseCOG201._id],
      createdBy: leadInstructorStaff._id
    });

    console.log('Creating programs...');
    const programCBT = await ensureProgram({
      name: 'CBT Certificate',
      code: 'CBT-CERT',
      departmentId: cognitive._id,
      type: 'certificate'
    });

    const programEMDR = await ensureProgram({
      name: 'EMDR Continuing Education',
      code: 'EMDR-CE',
      departmentId: emdr._id,
      type: 'continuing-education'
    });

    console.log('Creating classes...');
    const classBH101 = await ensureClass({
      name: 'BH101 - Fall Cohort',
      courseId: courseBH101._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-12-05'),
      instructorIds: [instructorStaff._id],
      maxEnrollment: 30
    });

    const classBH201 = await ensureClass({
      name: 'BH201 - Fall Cohort',
      courseId: courseBH201._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-12'),
      endDate: new Date('2025-12-07'),
      instructorIds: [instructorStaff._id],
      maxEnrollment: 24
    });

    const classCBT101 = await ensureClass({
      name: 'CBT101 - Fall Cohort',
      courseId: courseCBT101._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-12'),
      endDate: new Date('2025-12-10'),
      instructorIds: [contentStaff._id, leadInstructorStaff._id],
      maxEnrollment: 25
    });

    const classCBT201 = await ensureClass({
      name: 'CBT201 - Fall Cohort',
      courseId: courseCBT201._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-16'),
      endDate: new Date('2025-12-12'),
      instructorIds: [leadInstructorStaff._id],
      maxEnrollment: 20
    });

    const classEMDR101 = await ensureClass({
      name: 'EMDR101 - Fall Cohort',
      courseId: courseEMDR101._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2025-12-12'),
      instructorIds: [deptAdminStaff._id],
      maxEnrollment: 20
    });

    const classEMDR201 = await ensureClass({
      name: 'EMDR201 - Fall Cohort',
      courseId: courseEMDR201._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-18'),
      endDate: new Date('2025-12-15'),
      instructorIds: [deptAdminStaff._id],
      maxEnrollment: 18
    });

    // Riley's classes
    const classCOG101 = await ensureClass({
      name: 'COG101 - Fall Cohort',
      courseId: courseCOG101._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-08'),
      endDate: new Date('2025-12-08'),
      instructorIds: [leadInstructorStaff._id],
      maxEnrollment: 25
    });

    const classCOG201 = await ensureClass({
      name: 'COG201 - Fall Cohort',
      courseId: courseCOG201._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-10'),
      endDate: new Date('2025-12-10'),
      instructorIds: [leadInstructorStaff._id],
      maxEnrollment: 20
    });

    const classCOG301 = await ensureClass({
      name: 'COG301 - Fall Cohort',
      courseId: courseCOG301._id,
      academicYearId: academicYear._id,
      termCode: 'FALL2025',
      startDate: new Date('2025-09-12'),
      endDate: new Date('2025-12-12'),
      instructorIds: [leadInstructorStaff._id],
      maxEnrollment: 15
    });

    console.log('Creating content and course modules...');
    const courseList = [
      courseBH101,
      courseBH201,
      courseCBT101,
      courseCBT201,
      courseEMDR101,
      courseEMDR201,
      courseCOG101,
      courseCOG201,
      courseCOG301
    ];

    // Riley's courses get quiz-heavy content (assessment focused)
    const rileyModuleTemplates = [
      {
        title: 'Theory & Concepts',
        types: ['document', 'quiz'] as const
      },
      {
        title: 'Assessment Skills',
        types: ['quiz', 'quiz'] as const
      },
      {
        title: 'Comprehensive Exam',
        types: ['quiz'] as const
      }
    ];

    const moduleTemplates = [
      {
        title: 'Foundations',
        types: ['video', 'document', 'quiz'] as const
      },
      {
        title: 'Applied Practice',
        types: ['video', 'document', 'quiz'] as const
      },
      {
        title: 'Case Lab',
        types: ['video', 'quiz'] as const
      }
    ];

    const contentLabels: Record<string, string> = {
      video: 'Video Lesson',
      document: 'Reading',
      quiz: 'Knowledge Check',
      scorm: 'SCORM Lab'
    };

    const contentByCourse: Record<string, any[]> = {};
    const modulesByCourse: Record<
      string,
      Array<{
        moduleNumber: number;
        title: string;
        contents: any[];
      }>
    > = {};

    for (const course of courseList) {
      // Determine content owner based on department
      const isRileyCourse = course.createdBy?.toString() === leadInstructorStaff._id.toString();
      const owner = isRileyCourse
        ? leadInstructorStaff._id
        : course.departmentId.toString() === behavioral._id.toString()
          ? instructorStaff._id
          : course.departmentId.toString() === emdr._id.toString()
            ? deptAdminStaff._id
            : contentStaff._id;

      // Use quiz-heavy templates for Riley's courses
      const templates = isRileyCourse ? rileyModuleTemplates : moduleTemplates;

      const courseModules: Array<{
        moduleNumber: number;
        title: string;
        contents: any[];
      }> = [];
      const allContent: any[] = [];
      let sequence = 1;

      for (const [moduleIndex, moduleTemplate] of templates.entries()) {
        const moduleNumber = moduleIndex + 1;
        const moduleContents: any[] = [];

        for (const contentType of moduleTemplate.types) {
          const content = await ensureContent({
            title: `${course.code} M${moduleNumber} ${moduleTemplate.title} - ${contentLabels[contentType]}`,
            description: `${moduleTemplate.title} content for ${course.name}`,
            type: contentType,
            courseId: course._id,
            createdBy: owner
          });

          await ensureCourseContent({
            courseId: course._id,
            contentId: content._id,
            sequence,
            moduleNumber,
            isRequired: contentType !== 'document'
          });

          moduleContents.push(content);
          allContent.push(content);
          sequence += 1;
        }

        if (course.code === 'CBT101' && moduleNumber === 3) {
          const scorm = await ensureContent({
            title: `${course.code} M${moduleNumber} ${moduleTemplate.title} - ${contentLabels.scorm}`,
            description: `Interactive SCORM lab for ${course.name}`,
            type: 'scorm',
            courseId: course._id,
            createdBy: owner
          });

          await ensureCourseContent({
            courseId: course._id,
            contentId: scorm._id,
            sequence,
            moduleNumber,
            isRequired: true
          });

          moduleContents.push(scorm);
          allContent.push(scorm);
          sequence += 1;
        }

        courseModules.push({
          moduleNumber,
          title: moduleTemplate.title,
          contents: moduleContents
        });
      }

      contentByCourse[course._id.toString()] = allContent;
      modulesByCourse[course._id.toString()] = courseModules;
    }

    console.log('Creating question banks and questions...');
    for (const course of courseList) {
      const bank = await ensureQuestionBank({
        name: `${course.code} Assessment Bank`,
        description: `Question bank for ${course.name}`,
        departmentId: course.departmentId,
        tags: [course.code.toLowerCase(), 'assessment']
      });

      if (bank.questionIds && bank.questionIds.length >= 12) {
        continue;
      }

      const createdQuestions = [] as mongoose.Types.ObjectId[];
      for (let index = 0; index < 12; index += 1) {
        const moduleNumber = (index % moduleTemplates.length) + 1;

        // Use new monolithic question design with questionTypes[], correctAnswers[], distractors[]
        const questionTypeIndex = index % 4;
        let questionTypes: string[];
        let correctAnswers: string[];
        let distractors: string[] | undefined;
        let trueFalseData: { correctValue: boolean } | undefined;
        let shortAnswerData: { alternateAccepted?: string[] } | undefined;

        if (questionTypeIndex === 0) {
          // Multiple choice - can also be used as flashcard
          questionTypes = ['multiple_choice', 'flashcard'];
          correctAnswers = ['Option A'];
          distractors = ['Option B', 'Option C', 'Option D'];
        } else if (questionTypeIndex === 1) {
          // True/false
          questionTypes = ['true_false'];
          correctAnswers = ['True'];
          trueFalseData = { correctValue: true };
        } else if (questionTypeIndex === 2) {
          // Short answer
          questionTypes = ['short_answer'];
          correctAnswers = ['Sample answer'];
          shortAnswerData = { alternateAccepted: ['sample', 'Sample Answer'] };
        } else {
          // Matching-capable question
          questionTypes = ['multiple_choice', 'matching'];
          correctAnswers = ['Correct Match'];
          distractors = ['Wrong A', 'Wrong B', 'Wrong C'];
        }

        const question = await Question.create({
          questionText: `Module ${moduleNumber} question ${index + 1} for ${course.code}`,
          questionTypes,
          departmentId: course.departmentId,
          points: 10,
          correctAnswers,
          distractors,
          trueFalseData,
          shortAnswerData,
          difficulty: 'medium',
          tags: [course.code.toLowerCase(), `module-${moduleNumber}`, 'seeded'],
          questionBankIds: [bank._id.toString()],
          explanation: `This is the explanation for question ${index + 1} in ${course.code}`
        });
        createdQuestions.push(question._id);
      }

      bank.questionIds = createdQuestions;
      await bank.save();
    }

    // Seed CBT content in Cognitive Therapy department
    const adminUser = await User.findOne({ email: ADMIN_EMAIL });
    if (adminUser) {
      await seedCBTContent(cognitive._id, adminUser._id);
    }

    // Seed course content data (LearningUnits) for EMDR101, CBT101, BH101
    if (adminUser) {
      await seedCourseContentData(
        { EMDR101: courseEMDR101, CBT101: courseCBT101, BH101: courseBH101 },
        { emdr, cognitive, cbtFundamentals, behavioral },
        adminUser._id
      );
    }

    console.log('Creating enrollments...');
    await ensureEnrollment({
      learnerId: learnerOne._id,
      programId: programCBT._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    await ensureEnrollment({
      learnerId: learnerTwo._id,
      programId: programEMDR._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    await ensureEnrollment({
      learnerId: learnerThree._id,
      programId: programEMDR._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    await ensureEnrollment({
      learnerId: learnerFour._id,
      programId: programCBT._id,
      academicYearId: academicYear._id,
      status: 'active'
    });

    console.log('Creating class enrollments...');
    const classEnrollmentAssignments = [
      { learner: learnerOne, classItem: classCBT101 },
      { learner: learnerOne, classItem: classBH101 },
      { learner: learnerOne, classItem: classCBT201 },
      { learner: learnerOne, classItem: classCOG101 },
      { learner: learnerTwo, classItem: classBH101 },
      { learner: learnerTwo, classItem: classEMDR101 },
      { learner: learnerTwo, classItem: classBH201 },
      { learner: learnerTwo, classItem: classCOG101 },
      { learner: learnerTwo, classItem: classCOG201 },
      { learner: learnerThree, classItem: classEMDR101 },
      { learner: learnerThree, classItem: classEMDR201 },
      { learner: learnerThree, classItem: classCBT101 },
      { learner: learnerThree, classItem: classCOG101 },
      { learner: learnerFour, classItem: classBH101 },
      { learner: learnerFour, classItem: classBH201 },
      { learner: learnerFour, classItem: classCBT101 },
      { learner: learnerFour, classItem: classCOG101 },
      { learner: learnerFour, classItem: classCOG201 },
      { learner: learnerFour, classItem: classCOG301 }
    ];

    const enrollmentCounts = new Map<string, number>();

    for (const assignment of classEnrollmentAssignments) {
      await ensureClassEnrollment({
        learnerId: assignment.learner._id,
        classId: assignment.classItem._id,
        status: 'active'
      });

      const key = assignment.classItem._id.toString();
      enrollmentCounts.set(key, (enrollmentCounts.get(key) || 0) + 1);
    }

    for (const classItem of [
      classBH101,
      classBH201,
      classCBT101,
      classCBT201,
      classEMDR101,
      classEMDR201,
      classCOG101,
      classCOG201,
      classCOG301
    ]) {
      classItem.currentEnrollment = enrollmentCounts.get(classItem._id.toString()) || 0;
      await classItem.save();
    }

    console.log('Creating learning activity...');
    const learners = [learnerOne, learnerTwo, learnerThree, learnerFour];
    const classes = [
      classBH101,
      classBH201,
      classCBT101,
      classCBT201,
      classEMDR101,
      classEMDR201,
      classCOG101,
      classCOG201,
      classCOG301
    ];
    const courseById = new Map(courseList.map(course => [course._id.toString(), course]));
    const classByCourseId = new Map(classes.map(classItem => [classItem.courseId.toString(), classItem]));
    const coursesByLearner = new Map<string, Set<string>>();

    for (const assignment of classEnrollmentAssignments) {
      const key = assignment.learner._id.toString();
      const courseId = assignment.classItem.courseId.toString();
      if (!coursesByLearner.has(key)) {
        coursesByLearner.set(key, new Set());
      }
      coursesByLearner.get(key)!.add(courseId);
    }

    for (const learner of learners) {
      const learnerCourseIds = Array.from(coursesByLearner.get(learner._id.toString()) || []);

      for (const courseId of learnerCourseIds) {
        const course = courseById.get(courseId);
        if (!course) {
          continue;
        }

        const classItem = classByCourseId.get(courseId);
        const modules = modulesByCourse[courseId] || [];
        const completedModules = randomInt(1, modules.length);

        await LearningEvent.create({
          learnerId: learner._id,
          eventType: 'course-started',
          classId: classItem?._id,
          courseId: course._id,
          departmentId: course.departmentId,
          timestamp: randomDateWithinDays(30)
        });

        for (const module of modules) {
          const moduleStartedAt = randomDateWithinDays(20);
          await LearningEvent.create({
            learnerId: learner._id,
            eventType: 'module-started',
            classId: classItem?._id,
            courseId: course._id,
            departmentId: course.departmentId,
            timestamp: moduleStartedAt
          });

          const isCompleted = module.moduleNumber <= completedModules;
          for (const contentItem of module.contents) {
            if (!isCompleted && contentItem.type === 'quiz') {
              continue;
            }

            const startedAt = randomDateWithinDays(18);
            const completedAt = isCompleted ? randomDateWithinDays(10) : undefined;
            const score = contentItem.type === 'quiz' || contentItem.type === 'scorm' ? randomInt(70, 98) : undefined;

            await ContentAttempt.create({
              contentId: contentItem._id,
              learnerId: learner._id,
              status: isCompleted ? 'completed' : 'in-progress',
              attemptNumber: 1,
              progressPercent: isCompleted ? 100 : randomInt(10, 75),
              score,
              timeSpentSeconds: randomInt(600, 3600),
              startedAt,
              completedAt
            });

            await LearningEvent.create({
              learnerId: learner._id,
              eventType: 'content-started',
              classId: classItem?._id,
              contentId: contentItem._id,
              courseId: course._id,
              departmentId: course.departmentId,
              contentType: contentItem.type,
              timestamp: startedAt
            });

            if (contentItem.type === 'video') {
              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'video-played',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                contentType: contentItem.type,
                timestamp: startedAt
              });
            }

            if (isCompleted) {
              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'content-completed',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                contentType: contentItem.type,
                timestamp: completedAt || randomDateWithinDays(8),
                score
              });
            }

            if (contentItem.type === 'quiz' && isCompleted) {
              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'assessment-submitted',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                timestamp: completedAt || randomDateWithinDays(9),
                score
              });

              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'assessment-completed',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                timestamp: completedAt || randomDateWithinDays(9),
                score
              });

              await ExamResult.create({
                examId: contentItem._id,
                learnerId: learner._id,
                attemptNumber: 1,
                status: 'completed',
                score: score || 85,
                maxScore: 100,
                percentage: score || 85,
                passed: (score || 0) >= 70,
                startedAt,
                submittedAt: completedAt
              });
            }

            if (contentItem.type === 'scorm' && isCompleted) {
              await ScormAttempt.create({
                contentId: contentItem._id,
                learnerId: learner._id,
                attemptNumber: 1,
                scormVersion: '1.2',
                status: 'completed',
                scoreRaw: score || 85,
                scoreMin: 0,
                scoreMax: 100,
                progressMeasure: 1,
                startedAt,
                completedAt
              });

              await LearningEvent.create({
                learnerId: learner._id,
                eventType: 'scorm-completed',
                classId: classItem?._id,
                contentId: contentItem._id,
                courseId: course._id,
                departmentId: course.departmentId,
                timestamp: completedAt || randomDateWithinDays(8),
                score
              });
            }
          }

          if (isCompleted) {
            await LearningEvent.create({
              learnerId: learner._id,
              eventType: 'module-completed',
              classId: classItem?._id,
              courseId: course._id,
              departmentId: course.departmentId,
              timestamp: randomDateWithinDays(7)
            });
          }
        }

        if (completedModules === modules.length) {
          await LearningEvent.create({
            learnerId: learner._id,
            eventType: 'course-completed',
            classId: classItem?._id,
            courseId: course._id,
            departmentId: course.departmentId,
            timestamp: randomDateWithinDays(3)
          });
        }
      }
    }

    console.log('');
    console.log('Mock data seeded successfully.');
    console.log('');
    console.log('Users created (password):');
    console.log(`  - ${ADMIN_EMAIL} (${ADMIN_PASSWORD})`);
    console.log(`  - john.instructor@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - maria.content@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - sam.department@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - riley.instructor@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - taylor.billing@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - alex.learner@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - jordan.student@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - casey.learner@lms.edu (${DEFAULT_PASSWORD})`);
    console.log(`  - jamie.student@lms.edu (${DEFAULT_PASSWORD})`);
    console.log('');
  } catch (error) {
    console.error('Error seeding mock data:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

if (require.main === module) {
  main();
}

export default main;
