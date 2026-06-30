/**
 * Data Export Script
 * Run: node scripts/exportData.js
 * Creates: scripts/export_data.json (saara data)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MODELS = [
  'Admin', 'Student', 'Teacher', 'Class', 'Subject',
  'Exam', 'Mark', 'Attendance', 'Homework', 'HomeworkCompletion',
  'Announcement', 'FeeStructure', 'FeePayment', 'Settings',
  'BusRoute', 'TeacherAssignment', 'Timetable', 'Datesheet',
  'Holiday', 'Syllabus', 'Notification', 'PushSubscription'
];

async function exportAll() {
  console.log('Connecting to local MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected!');

  const exportData = {};
  let totalDocs = 0;

  for (const modelName of MODELS) {
    try {
      const Model = require(`../models/${modelName}`);
      const docs = await Model.find({}).lean();
      exportData[modelName] = docs;
      totalDocs += docs.length;
      console.log(`  ✅ ${modelName}: ${docs.length} records`);
    } catch (err) {
      console.log(`  ⚠️  ${modelName}: skipped (${err.message})`);
      exportData[modelName] = [];
    }
  }

  const outPath = path.join(__dirname, 'export_data.json');
  fs.writeFileSync(outPath, JSON.stringify(exportData, null, 2));
  console.log(`\n✅ Export complete! Total: ${totalDocs} documents`);
  console.log(`📁 Saved to: ${outPath}`);
  process.exit(0);
}

exportAll().catch(e => { console.error(e); process.exit(1); });
