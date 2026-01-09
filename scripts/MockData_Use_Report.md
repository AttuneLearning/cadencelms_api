# Mock Data Use Report

## Overview
This document provides credentials and instructions for using the LMS mock data system.

## Mock Database
- **Database Name:** `lms_v2_mockdata`
- **MongoDB URI:** `mongodb://localhost:27017/lms_v2_mockdata`

---

## User Credentials

All users have the same password for testing convenience:
- **Password:** `Password123!`

### Staff Users (4)

| Email | Role(s) | Default Dashboard | Description |
|-------|---------|-------------------|-------------|
| `admin@lms.edu` | System Admin | System Admin | Full system administrator |
| `sarah.content@lms.edu` | Content Admin | Content Admin | Content management only |
| `john.dept@lms.edu` | Department Admin | Department Admin | Department administrator |
| `emily.multi@lms.edu` | System Admin, Content Admin, Department Admin | System Admin | Multi-role administrator |

### Learner Users (2)

| Email | Name | Enrollments | Description |
|-------|------|-------------|-------------|
| `michael.student@lms.edu` | Michael Student | 2 Programs + Standalone Courses | Enrolled in multiple programs |
| `jessica.learner@lms.edu` | Jessica Learner | 1 Program + Standalone Courses | Single program enrollment |

---

## Loading Mock Data

### Quick Start
```bash
npm run seed:mock
```

### Detailed Steps

1. **Ensure MongoDB is running:**
   ```bash
   # Check if MongoDB is running
   systemctl status mongod
   # Or start it if needed
   sudo systemctl start mongod
   ```

2. **Navigate to project directory:**
   ```bash
   cd /home/adam/github/lms_node/1_LMS_Node_V2
   ```

3. **Run the seed script:**
   ```bash
   npm run seed:mock
   ```

4. **Expected output:**
   - Database connection confirmation
   - Progress messages for each data type
   - Summary showing counts of all created data
   - Total execution time

5. **Verify data loaded:**
   ```bash
   mongosh lms_v2_mockdata --eval "db.stats()"
   ```

### What Gets Created

- **6 Departments** (including Master, with 2 subdepartments)
- **6 Users** (4 Staff, 2 Learners)
- **1 Academic Year** (2025-2026 with 2 terms)
- **20 Courses** across departments
- **~40 Course Segments** (1-3 per course)
- **15 Exams** with 60 total questions
- **3 Programs** (certification programs)
- **10 Classes** (scheduled course instances)
- **~15 Enrollments** (program and standalone)
- **~50 Learning Activities** (content attempts, events, exam results)
- **10-15 SCORM Attempts**
- **4 System Settings**
- **20 Audit Logs**

---

## Purging Mock Data

### Quick Purge (with confirmation)
```bash
npm run purge:mock
```
You will be prompted to confirm by typing `yes`.

### Force Purge (no confirmation)
```bash
npm run purge:mock:force
```
**⚠️ Warning:** This will delete all data immediately without confirmation!

### Reset Everything
```bash
npm run reset:mock
```
This will purge all data (forced) and then reload fresh mock data.

### Advanced Purge Options

**Drop entire database:**
```bash
MOCK_DB_URI=mongodb://localhost:27017/lms_v2_mockdata ts-node scripts/purge-mock-data.ts --drop-db
```

**Programmatic purge in code:**
```bash
MOCK_DB_URI=mongodb://localhost:27017/lms_v2_mockdata ts-node scripts/purge-mock-data.ts --force
```

---

## Common Use Cases

### Testing API Endpoints
1. Load mock data: `npm run seed:mock`
2. Start the server
3. Log in using any of the credentials above
4. Test API endpoints with realistic data
5. Purge when done: `npm run purge:mock:force`

### Development Workflow
1. Reset data: `npm run reset:mock`
2. Make code changes
3. Test with fresh data
4. Repeat as needed

### Demo Preparation
1. Purge old data: `npm run purge:mock:force`
2. Load fresh data: `npm run seed:mock`
3. Verify key scenarios work
4. Ready for demo!

### Testing Different Roles
- **System Admin:** Log in as `admin@lms.edu`
- **Content Creator:** Log in as `sarah.content@lms.edu`
- **Department Manager:** Log in as `john.dept@lms.edu`
- **Multi-Role User:** Log in as `emily.multi@lms.edu`
- **Active Learner:** Log in as `michael.student@lms.edu`
- **Basic Learner:** Log in as `jessica.learner@lms.edu`

---

## Department Structure

### Main Departments
1. **Cognitive Therapy** (with 2 subdepartments)
2. **EMDR**
3. **Basic Therapy**

### Subdepartments
- **CBT Advanced** (under Cognitive Therapy)
- **CBT Fundamentals** (under Cognitive Therapy)

### Master Department
- **Master Department** (system-wide, auto-created)

---

## Troubleshooting

### Data already exists
**Error:** "Duplicate key error" or similar
**Solution:** Run `npm run purge:mock:force` first, then `npm run seed:mock`

### MongoDB not running
**Error:** "Connection refused" or "ECONNREFUSED"
**Solution:** Start MongoDB: `sudo systemctl start mongod`

### Wrong database
**Issue:** Data appearing in wrong database
**Solution:** Check that `MOCK_DB_URI` environment variable is set correctly in package.json scripts

### Permission errors
**Error:** "Permission denied" when running scripts
**Solution:** Ensure you have write permissions to the MongoDB data directory

### TypeScript errors
**Error:** TypeScript compilation errors
**Solution:** Ensure all dependencies are installed: `npm install`

---

## Security Notes

⚠️ **IMPORTANT:** This mock data is for **DEVELOPMENT AND TESTING ONLY**

- Never use these credentials in production
- Never load mock data into production databases
- All passwords are intentionally simple and the same
- Mock data database is separate: `lms_v2_mockdata`

---

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `seed:mock` | `npm run seed:mock` | Load all mock data with confirmation |
| `purge:mock` | `npm run purge:mock` | Remove all mock data (prompts for confirmation) |
| `purge:mock:force` | `npm run purge:mock:force` | Remove all mock data without confirmation |
| `reset:mock` | `npm run reset:mock` | Purge and reload all mock data |

---

## Additional Resources

- **Full Documentation:** See [scripts/README.md](./README.md)
- **Seed Script:** [scripts/seed-mock-data.ts](./seed-mock-data.ts)
- **Purge Script:** [scripts/purge-mock-data.ts](./purge-mock-data.ts)

---

**Last Updated:** January 7, 2026  
**Version:** 1.0.0
