import { LookupValue } from '@/models/LookupValue.model';
import { invalidateCache } from '@/utils/lookup-validators';

const LEARNING_UNIT_CATEGORY_LOOKUP = 'learning-unit-category';
const LEARNING_UNIT_TYPE_LOOKUP = 'learning-unit-type';

const LEARNING_UNIT_CATEGORIES = [
  {
    category: LEARNING_UNIT_CATEGORY_LOOKUP,
    key: 'topic',
    lookupId: `${LEARNING_UNIT_CATEGORY_LOOKUP}.topic`,
    displayAs: 'Topic',
    sortOrder: 1,
    isActive: true
  },
  {
    category: LEARNING_UNIT_CATEGORY_LOOKUP,
    key: 'assignment',
    lookupId: `${LEARNING_UNIT_CATEGORY_LOOKUP}.assignment`,
    displayAs: 'Assignment',
    sortOrder: 2,
    isActive: true
  },
  {
    category: LEARNING_UNIT_CATEGORY_LOOKUP,
    key: 'practice',
    lookupId: `${LEARNING_UNIT_CATEGORY_LOOKUP}.practice`,
    displayAs: 'Practice',
    sortOrder: 3,
    isActive: true
  },
  {
    category: LEARNING_UNIT_CATEGORY_LOOKUP,
    key: 'graded',
    lookupId: `${LEARNING_UNIT_CATEGORY_LOOKUP}.graded`,
    displayAs: 'Graded',
    sortOrder: 4,
    isActive: true
  }
];

const LEARNING_UNIT_TYPES = [
  {
    category: LEARNING_UNIT_TYPE_LOOKUP,
    key: 'media',
    lookupId: `${LEARNING_UNIT_TYPE_LOOKUP}.media`,
    displayAs: 'Media',
    sortOrder: 1,
    isActive: true
  },
  {
    category: LEARNING_UNIT_TYPE_LOOKUP,
    key: 'document',
    lookupId: `${LEARNING_UNIT_TYPE_LOOKUP}.document`,
    displayAs: 'Document',
    sortOrder: 2,
    isActive: true
  },
  {
    category: LEARNING_UNIT_TYPE_LOOKUP,
    key: 'scorm',
    lookupId: `${LEARNING_UNIT_TYPE_LOOKUP}.scorm`,
    displayAs: 'SCORM',
    sortOrder: 3,
    isActive: true
  },
  {
    category: LEARNING_UNIT_TYPE_LOOKUP,
    key: 'custom',
    lookupId: `${LEARNING_UNIT_TYPE_LOOKUP}.custom`,
    displayAs: 'Custom',
    sortOrder: 4,
    isActive: true
  },
  {
    category: LEARNING_UNIT_TYPE_LOOKUP,
    key: 'exercise',
    lookupId: `${LEARNING_UNIT_TYPE_LOOKUP}.exercise`,
    displayAs: 'Exercise',
    sortOrder: 5,
    isActive: true
  },
  {
    category: LEARNING_UNIT_TYPE_LOOKUP,
    key: 'assessment',
    lookupId: `${LEARNING_UNIT_TYPE_LOOKUP}.assessment`,
    displayAs: 'Assessment',
    sortOrder: 6,
    isActive: true
  },
  {
    category: LEARNING_UNIT_TYPE_LOOKUP,
    key: 'assignment',
    lookupId: `${LEARNING_UNIT_TYPE_LOOKUP}.assignment`,
    displayAs: 'Assignment',
    sortOrder: 7,
    isActive: true
  }
];

async function seedLookupValues(values: Array<{ category: string; key: string; lookupId: string; displayAs: string; sortOrder: number; isActive: boolean; }>): Promise<void> {
  for (const value of values) {
    await LookupValue.updateOne(
      { category: value.category, key: value.key },
      { $setOnInsert: value },
      { upsert: true }
    );
  }
}

export async function seedLearningUnitLookups(): Promise<void> {
  await seedLookupValues(LEARNING_UNIT_CATEGORIES);
  await seedLookupValues(LEARNING_UNIT_TYPES);

  invalidateCache(LEARNING_UNIT_CATEGORY_LOOKUP);
  invalidateCache(LEARNING_UNIT_TYPE_LOOKUP);
}
