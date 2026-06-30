/**
 * AUTO TIMETABLE FILLER
 * ---------------------
 * Standalone script ΓÇö run with:
 *   node backend/scripts/autoFillTimetable.js
 *
 * What it does:
 *  1. Loads all classes from DB
 *  2. For each class, loads its teacher assignments (who teaches what)
 *  3. Distributes subjects evenly across periods
 *  4. Saves the SAME schedule for every working day (MonΓÇôSat)
 *
 * Config: edit the CONFIG block below before running.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Class = require('../models/Class');
const Subject = require('../models/Subject');
const TeacherAssignment = require('../models/TeacherAssignment');
const Timetable = require('../models/Timetable');
const Settings = require('../models/Settings');

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// CONFIG ΓÇö adjust to your school's schedule
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
const CONFIG = {
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  // Period slots: each entry = { start, end, type }
  // type: 'Class' | 'Break' | 'Assembly'
  periodSlots: [
    { start: '08:00', end: '08:30', type: 'Assembly' },
    { start: '08:30', end: '09:15', type: 'Class' },
    { start: '09:15', end: '10:00', type: 'Class' },
    { start: '10:00', end: '10:45', type: 'Class' },
    { start: '10:45', end: '11:00', type: 'Break' },
    { start: '11:00', end: '11:45', type: 'Class' },
    { start: '11:45', end: '12:30', type: 'Class' },
    { start: '12:30', end: '13:15', type: 'Class' },
    { start: '13:15', end: '13:30', type: 'Break' },
    { start: '13:30', end: '14:15', type: 'Class' },
  ],

  // If true, overwrites existing timetable entries; if false, skips days already filled
  overwrite: true,
};
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Γ£à Connected to MongoDB');

  // Get current academic year from settings
  const settings = await Settings.findOne();
  const academicYear = settings?.currentAcademicYear || '2025-26';
  console.log(`≡ƒôà Academic Year: ${academicYear}`);

  const classes = await Class.find();
  console.log(`≡ƒÅ½ Found ${classes.length} classes\n`);

  let totalSaved = 0;
  let totalSkipped = 0;

  for (const cls of classes) {
    console.log(`\nΓöÇΓöÇ Class: ${cls.className} (${cls._id})`);

    // Load teacher assignments for this class
    const assignments = await TeacherAssignment.find({ classId: cls._id })
      .populate('subjectId', 'subjectName')
      .populate('teacherId', 'name');

    if (assignments.length === 0) {
      console.log(`   ΓÜá∩╕Å  No teacher assignments found ΓÇö skipping`);
      continue;
    }

    // Build a rotation list of { subjectId, teacherId } for Class-type periods
    const rotation = assignments.map(a => ({
      subjectId: a.subjectId._id,
      teacherId: a.teacherId._id,
      subjectName: a.subjectId.subjectName,
      teacherName: a.teacherId.name,
    }));

    // Build the periods array for one day
    const buildPeriods = () => {
      let classSlotIndex = 0; // cycles through rotation
      return CONFIG.periodSlots.map((slot, i) => {
        const base = {
          periodNumber: i + 1,
          startTime: slot.start,
          endTime: slot.end,
          periodType: slot.type,
        };

        if (slot.type === 'Class') {
          const assignment = rotation[classSlotIndex % rotation.length];
          classSlotIndex++;
          return {
            ...base,
            subjectId: assignment.subjectId,
            teacherId: assignment.teacherId,
          };
        }

        // Break / Assembly ΓÇö no subject or teacher
        return base;
      });
    };

    const periods = buildPeriods();

    // Save for each day
    for (const day of CONFIG.days) {
      const existing = await Timetable.findOne({ classId: cls._id, day, academicYear });

      if (existing && !CONFIG.overwrite) {
        console.log(`   ΓÅ¡∩╕Å  ${day} already exists ΓÇö skipped`);
        totalSkipped++;
        continue;
      }

      await Timetable.findOneAndUpdate(
        { classId: cls._id, day, academicYear },
        {
          classId: cls._id,
          day,
          periods,
          academicYear,
        },
        { upsert: true, new: true }
      );

      console.log(`   Γ£à ${day} saved (${periods.length} periods)`);
      totalSaved++;
    }
  }

  console.log(`\n≡ƒÄë Done! Saved: ${totalSaved} | Skipped: ${totalSkipped}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Γ¥î Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});