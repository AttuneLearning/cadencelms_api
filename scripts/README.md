# Mock Data Scripts for LMS V2

This directory contains scripts for generating and managing test data in the `lms_v2_mockdata` database.

## Overview

The mock data generation creates a comprehensive, realistic dataset for testing and development purposes. All data is loaded into a separate `lms_v2_mockdata` database to avoid interference with production or test databases.

## Quick Start

```bash
# Generate all mock data
npm run seed:mock

# Remove all mock data
npm run purge:mock

# Remove and regenerate (reset)
npm run reset:mock
```

## Generated Data

### Organization Structure
- **6 Departments** (including Master Department)
  - Master Department (root)
  - Cognitive Therapy
  - EMDR
  - Basic Therapy (with 2 subdepartments)
    - Counseling Services
    - Crisis Intervention

### Users
- **4 Staff Members**
  - Sarah Anderson (admin@lms.com) - System Admin only, default dashboard: sys-admin
  - John Smith (john.smith@lms.com) - System Admin + Content Admin + Department Admin
  - Emily Jones (emily.jones@lms.com) - System Admin + Content Admin
  - Michael Brown (michael.brown@lms.com) - Content Admin + Department Admin

- **2 Learners**
  - Alice Johnson (alice.student@lms.com) - Enrolled in 2 programs + standalone courses
  - Bob Williams (bob.learner@lms.com) - Enrolled in 1 program + standalone courses

**All passwords:** `Password123!`

### Academic Content
- **1 Academic Year** (2025-2026) with 2 terms
- **20 Courses** with 1-3 content segments each
  - Randomly distributed across departments
  - 5 courses assigned to multiple departments
  - Courses include: CBT, EMDR, Basic Therapy, Counseling, Crisis Management topics

- **15 Exams** with 4 questions each (60 total questions)
  - Question types: Multiple Choice, True/False, Short Answer, Essay
  - All linked to courses

- **3 Programs**
  - Cognitive Therapy Certification
  - EMDR Practitioner Program
  - Basic Therapy Foundations

- **10 Class Instances** (scheduled course sections)

### Learning Activity
- **Course Enrollments** - Both learners enrolled in program and standalone courses
- **Content Attempts** - Learners viewing/completing course content
- **Learning Events** - Course starts, lesson completions, quiz submissions
- **Exam Results** - Test scores and detailed answer data
- **5 SCORM Packages** with learner attempts

### System Data
- **Permissions & Role Mappings** - Complete RBAC setup
- **System Settings** - Configuration values
- **Audit Logs** - Sample activity tracking (20 entries)

## NPM Scripts

### Seed Mock Data
```bash
npm run seed:mock
```
Generates all mock data in the `lms_v2_mockdata` database. Safe to run multiple times (will create duplicates).

**Output:**
- Departments with hierarchy
- Users (staff and learners)
- Courses, programs, and classes
- Enrollments and learning activity
- SCORM packages and attempts
- System settings

### Purge Mock Data
```bash
npm run purge:mock
```
Removes all data from the mock database. **Requires confirmation.**

Use `--force` flag to skip confirmation:
```bash
npm run purge:mock:force
```

### Reset Mock Data
```bash
npm run reset:mock
```
Purges and regenerates all mock data in one command.

## Environment Variables

The scripts use the following environment variable:

```bash
MOCK_DB_URI=mongodb://localhost:27017/lms_v2_mockdata
```

You can override this in your `.env` file or when running scripts:

```bash
MOCK_DB_URI=mongodb://other-host:27017/other_db npm run seed:mock
```

## Data Summary

After running `npm run seed:mock`, you'll have:

| Entity | Count | Notes |
|--------|-------|-------|
| **Departments** | 6 | Including Master + 2 subdepartments |
| **Users** | 6 | 4 staff + 2 learners |
| **Courses** | 20 | With 1-3 content segments each |
| **Programs** | 3 | Certification programs |
| **Classes** | 10 | Scheduled course instances |
| **Content Items** | 40-60 | Course modules |
| **Question Banks** | 15 | One per exam |
| **Questions** | 60 | 4 questions per exam |
| **Enrollments** | 15-20 | Program + standalone courses |
| **Content Attempts** | 50+ | Learner content views |
| **Exam Results** | 10-15 | Completed exams |
| **SCORM Attempts** | 10-15 | Linked to content items |
| **Audit Logs** | 20 | Sample activity |

## Use Cases

### Development
Use mock data to develop and test features locally without setting up production-like data manually.

### Testing
Run integration tests against realistic data structures:
```bash
# Set test database to mock data
MONGODB_URI=mongodb://localhost:27017/lms_v2_mockdata npm run dev
```

### Demonstrations
Show the system with realistic data for demos, screenshots, or training.

### API Testing
Use Postman or similar tools with real user credentials:
```
POST /api/v2/auth/login
{
  "email": "admin@lms.com",
  "password": "Password123!"
}
```

## Staff Roles Breakdown

| Email | Roles | Default Dashboard | Department |
|-------|-------|-------------------|------------|
| admin@lms.com | system-admin | sys-admin | Master Department |
| john.smith@lms.com | system-admin, content-admin, department-admin | default | Cognitive Therapy |
| emily.jones@lms.com | system-admin, content-admin | default | EMDR |
| michael.brown@lms.com | content-admin, department-admin | default | Basic Therapy |

## Learner Enrollments

### Alice Johnson (alice.student@lms.com)
- **Program Enrollments:** 2 programs
- **Standalone Courses:** 3 courses
- **Total Enrollments:** ~9-10 courses
- **Activity:** Content attempts, exam results, SCORM attempts

### Bob Williams (bob.learner@lms.com)
- **Program Enrollments:** 1 program
- **Standalone Courses:** 3 courses
- **Total Enrollments:** ~6-7 courses
- **Activity:** Content attempts, exam results, SCORM attempts

## Data Relationships

The generated data maintains all relationships:

```
Department
  ├── Courses (20)
  │   ├── Content (1-3 segments each)
  │   ├── Question Banks (15 courses have exams)
  │   │   └── Questions (4 per bank)
  │   ├── SCORM Packages (5 courses)
  │   └── Classes (10 scheduled instances)
  ├── Programs (3)
  │   └── Required Courses (3-4 per program)
  └── Staff (assigned by department)

Learners (2)
  ├── Program Enrollments
  ├── Course Enrollments (program + standalone)
  ├── Content Attempts
  ├── Exam Results
  └── SCORM Attempts
```

## Recommendations for Testing End-to-End

The mock data includes everything needed to visualize the system working end-to-end:

### ✅ Already Included:
- [x] User authentication (6 users with different roles)
- [x] Department hierarchy (parent-child relationships)
- [x] Course catalog with content
- [x] Program enrollments
- [x] Standalone course enrollments
- [x] Learning progress tracking
- [x] Assessment/exam data with answers
- [x] SCORM package integration
- [x] Audit logging
- [x] System settings

### 📋 Additional Data You Might Want to Add:

1. **Reports**
   - Scheduled reports
   - Generated report files
   - Report history

2. **Notifications**
   - Email notifications (if you have a notification system)
   - In-app notifications
   - Announcement messages

3. **Discussions/Forums**
   - Course discussions (if implemented)
   - Student questions
   - Instructor responses

4. **Assignments**
   - Assignment submissions (if separate from exams)
   - Graded work
   - Feedback comments

5. **Certificates**
   - Completion certificates
   - Program certificates
   - Badge awards

6. **Calendar Events**
   - Live sessions
   - Office hours
   - Deadlines

7. **Grade Book**
   - Weighted grade calculations
   - Grade history
   - Grade appeals

## Troubleshooting

### Database Connection Error
```bash
# Make sure MongoDB is running
sudo systemctl start mongod

# Or if using Docker
docker start mongodb
```

### TypeScript Compilation Errors
```bash
# Rebuild TypeScript
npm run build
```

### Duplicate Data
The seed script will create duplicates if run multiple times. To avoid this:
```bash
# Always purge before seeding
npm run reset:mock
```

### Permission Errors
Make sure you have write access to the MongoDB instance and the database.

## Maintenance

### Adding New Mock Data
To add new entities to the mock data:

1. Import the model in `seed-mock-data.ts`
2. Create a generator function (e.g., `createNewEntities()`)
3. Add to the `mockData` storage object
4. Call the function in `main()`
5. Add the model to `purge-mock-data.ts` collections array

### Modifying Existing Data
Edit the generator functions in `seed-mock-data.ts`. Common modifications:
- Change user count
- Adjust course numbers
- Modify department structure
- Update enrollment patterns

## Best Practices

1. **Separate Databases:** Always use `lms_v2_mockdata` - never use production or test databases
2. **Reset Between Tests:** Run `npm run reset:mock` for clean state
3. **Realistic Data:** Mock data should represent real-world scenarios
4. **Document Changes:** Update this README when modifying scripts
5. **Version Control:** Commit script changes but not generated data

## Security Note

⚠️ **The mock data uses simple, predictable passwords (`Password123!`) for ALL users. This is intentional for testing purposes but should NEVER be used in production!**

---

**For questions or issues with mock data scripts, contact the development team.**

**Last Updated:** January 7, 2026
