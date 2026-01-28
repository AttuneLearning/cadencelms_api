/**
 * Seed Cognitive Depth Levels
 *
 * Seeds the system default cognitive depth levels used for adaptive learning.
 * These are the foundation levels available to all departments.
 * Departments can override these or add custom levels.
 *
 * Usage:
 *   npx ts-node scripts/seed-cognitive-depth-levels.ts
 *
 * Related: LEARNER_ACTIVITY_KNOWLEDGE_NODE_SPEC.md
 */

import mongoose from 'mongoose';
import { loadEnv } from './utils/load-env';

loadEnv();

const DB_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.MOCK_DB_URI ||
  'mongodb://localhost:27017/lms_mock';

// Define the schema inline since model may not exist yet
const CognitiveDepthLevelSchema = new mongoose.Schema(
  {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 50
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    order: {
      type: Number,
      required: true,
      min: 0.1
    },
    advanceThreshold: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.8
    },
    minAttempts: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
      default: 3
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: 'cognitivedepthlevels'
  }
);

// Compound unique index: slug + departmentId
CognitiveDepthLevelSchema.index({ slug: 1, departmentId: 1 }, { unique: true });
CognitiveDepthLevelSchema.index({ departmentId: 1, order: 1 });
CognitiveDepthLevelSchema.index({ isDefault: 1 });

const CognitiveDepthLevel = mongoose.model('CognitiveDepthLevel', CognitiveDepthLevelSchema);

/**
 * Default system cognitive depth levels
 * These are seeded with departmentId: null and isDefault: true
 */
const DEFAULT_LEVELS = [
  {
    slug: 'exposure',
    name: 'Exposure',
    description: 'First introduction to concept - recognition, definitions, basic recall. Learner can identify and remember key terms and facts.',
    order: 1,
    advanceThreshold: 0.70,
    minAttempts: 2
  },
  {
    slug: 'practice',
    name: 'Practice',
    description: 'Building familiarity - apply concept in simple, direct contexts. Learner can use knowledge in straightforward situations.',
    order: 2,
    advanceThreshold: 0.80,
    minAttempts: 3
  },
  {
    slug: 'proficiency',
    name: 'Proficiency',
    description: 'Consistent application - multi-step reasoning, varied contexts. Learner can analyze and apply knowledge in complex scenarios.',
    order: 3,
    advanceThreshold: 0.85,
    minAttempts: 4
  },
  {
    slug: 'mastery',
    name: 'Mastery',
    description: 'Deep understanding - synthesis, edge cases, can teach others. Learner demonstrates expert-level comprehension and can create novel applications.',
    order: 4,
    advanceThreshold: 0.90,
    minAttempts: 5
  }
];

async function connectDB() {
  try {
    await mongoose.connect(DB_URI);
    console.log(`Connected to database: ${DB_URI}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

export async function seedCognitiveDepthLevels(): Promise<void> {
  console.log('Seeding cognitive depth levels...');

  for (const level of DEFAULT_LEVELS) {
    try {
      const existing = await CognitiveDepthLevel.findOne({
        slug: level.slug,
        departmentId: null
      });

      if (existing) {
        // Update existing level
        existing.name = level.name;
        existing.description = level.description;
        existing.order = level.order;
        existing.advanceThreshold = level.advanceThreshold;
        existing.minAttempts = level.minAttempts;
        existing.isDefault = true;
        existing.isActive = true;
        await existing.save();
        console.log(`  Updated: ${level.slug}`);
      } else {
        // Create new level
        await CognitiveDepthLevel.create({
          ...level,
          departmentId: null,
          isDefault: true,
          isActive: true
        });
        console.log(`  Created: ${level.slug}`);
      }
    } catch (error) {
      console.error(`  Error seeding ${level.slug}:`, error);
    }
  }

  console.log('Cognitive depth levels seeded successfully.');
}

async function main() {
  console.log('Cognitive Depth Levels Seed Script');
  console.log('===================================');
  console.log('');

  try {
    await connectDB();
    await seedCognitiveDepthLevels();

    // Display summary
    const levels = await CognitiveDepthLevel.find({ departmentId: null, isDefault: true }).sort({ order: 1 });
    console.log('');
    console.log('System Default Levels:');
    console.log('');
    console.log('| Slug        | Name        | Order | Threshold | Min Attempts |');
    console.log('|-------------|-------------|-------|-----------|--------------|');
    for (const level of levels) {
      console.log(
        `| ${level.slug.padEnd(11)} | ${level.name.padEnd(11)} | ${String(level.order).padEnd(5)} | ${(level.advanceThreshold * 100).toFixed(0).padStart(7)}%  | ${String(level.minAttempts).padEnd(12)} |`
      );
    }
    console.log('');
  } catch (error) {
    console.error('Error seeding cognitive depth levels:', error);
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default seedCognitiveDepthLevels;
