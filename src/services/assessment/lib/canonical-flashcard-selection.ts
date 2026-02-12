import mongoose from 'mongoose';
import CanonicalCourse from '@/models/academic/CanonicalCourse.model';
import CourseVersion from '@/models/academic/CourseVersion.model';
import CourseVersionModule from '@/models/academic/CourseVersionModule.model';
import LearningUnit from '@/models/content/LearningUnit.model';
import LearningUnitQuestion from '@/models/content/LearningUnitQuestion.model';
import { ApiError } from '@/utils/ApiError';

export interface QuestionProvenance {
  questionId: string;
  learningUnitId: string;
  learningUnitQuestionId: string;
  sourceModuleId: string;
}

interface CourseVersionContext {
  canonicalCourseId: mongoose.Types.ObjectId;
  courseVersionId: mongoose.Types.ObjectId;
}

async function resolveCourseVersionContext(courseId: string): Promise<CourseVersionContext> {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw ApiError.notFound('Course not found');
  }

  const canonical = await CanonicalCourse.findById(courseId).select(
    '_id currentPublishedVersionId latestDraftVersionId'
  );
  if (!canonical) {
    throw ApiError.notFound('Course not found');
  }

  const versionId =
    canonical.currentPublishedVersionId ||
    canonical.latestDraftVersionId ||
    (
      await CourseVersion.findOne({
        canonicalCourseId: canonical._id,
        status: 'published'
      }).select('_id')
    )?._id;

  if (!versionId) {
    throw ApiError.notFound('Course not found');
  }

  return {
    canonicalCourseId: canonical._id as mongoose.Types.ObjectId,
    courseVersionId: versionId as mongoose.Types.ObjectId
  };
}

export async function resolveFlashcardQuestionProvenance(
  courseId: string,
  moduleId?: string
): Promise<QuestionProvenance[]> {
  const context = await resolveCourseVersionContext(courseId);

  const courseModules = (await CourseVersionModule.find({
    courseVersionId: context.courseVersionId
  })
    .select('moduleId order')
    .sort({ order: 1 })
    .lean()) as Array<{ moduleId: mongoose.Types.ObjectId; order: number }>;

  const moduleOrderMap = new Map(
    courseModules.map((courseModule) => [courseModule.moduleId.toString(), courseModule.order])
  );

  let scopedModuleIds = courseModules.map((courseModule) => courseModule.moduleId);

  if (moduleId) {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      throw ApiError.badRequest('Invalid moduleId');
    }

    const moduleInCourse = courseModules.some(
      (courseModule) => courseModule.moduleId.toString() === moduleId
    );
    if (!moduleInCourse) {
      throw ApiError.badRequest('Module does not belong to this course');
    }

    scopedModuleIds = [new mongoose.Types.ObjectId(moduleId)];
  }

  if (scopedModuleIds.length === 0) {
    return [];
  }

  const learningUnits = (await LearningUnit.find({
    moduleId: { $in: scopedModuleIds },
    isActive: true
  })
    .select('_id moduleId sequence')
    .sort({ sequence: 1 })
    .lean()) as Array<{
    _id: mongoose.Types.ObjectId;
    moduleId: mongoose.Types.ObjectId;
    sequence: number;
  }>;

  if (learningUnits.length === 0) {
    return [];
  }

  const learningUnitById = new Map(
    learningUnits.map((learningUnit) => [learningUnit._id.toString(), learningUnit])
  );

  const learningUnitIds = learningUnits.map((learningUnit) => learningUnit._id);

  const links = (await LearningUnitQuestion.find({
    learningUnitId: { $in: learningUnitIds }
  })
    .select('_id learningUnitId questionId sequence')
    .sort({ sequence: 1 })
    .lean()) as Array<{
    _id: mongoose.Types.ObjectId;
    learningUnitId: mongoose.Types.ObjectId;
    questionId: mongoose.Types.ObjectId;
    sequence: number;
  }>;

  if (links.length === 0) {
    return [];
  }

  const sortedLinks = [...links].sort((a, b) => {
    const aLu = learningUnitById.get(a.learningUnitId.toString());
    const bLu = learningUnitById.get(b.learningUnitId.toString());

    const aModuleOrder = aLu ? moduleOrderMap.get(aLu.moduleId.toString()) || 0 : 0;
    const bModuleOrder = bLu ? moduleOrderMap.get(bLu.moduleId.toString()) || 0 : 0;
    if (aModuleOrder !== bModuleOrder) {
      return aModuleOrder - bModuleOrder;
    }

    const aLuSequence = aLu?.sequence || 0;
    const bLuSequence = bLu?.sequence || 0;
    if (aLuSequence !== bLuSequence) {
      return aLuSequence - bLuSequence;
    }

    return a.sequence - b.sequence;
  });

  const seenQuestions = new Set<string>();
  const provenance: QuestionProvenance[] = [];

  for (const link of sortedLinks) {
    const questionId = link.questionId.toString();
    if (seenQuestions.has(questionId)) {
      continue;
    }

    const learningUnit = learningUnitById.get(link.learningUnitId.toString());
    if (!learningUnit) {
      continue;
    }

    seenQuestions.add(questionId);
    provenance.push({
      questionId,
      learningUnitId: learningUnit._id.toString(),
      learningUnitQuestionId: link._id.toString(),
      sourceModuleId: learningUnit.moduleId.toString()
    });
  }

  return provenance;
}
