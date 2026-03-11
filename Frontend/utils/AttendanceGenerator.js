/**
 * AttendanceGenerator.js - Generate dummy attendance data from subjects
 * Used for Parents to display subject-wise attendance
 */

// Helper to get a pseudo-random value between min and max
const getRandomInRange = (min, max, seed = 0) => {
  // Use seed to make it consistent for same subject
  const hash = seed * 0.5 + 0.5;
  return Math.floor(min + (hash * (max - min)));
};

// Helper to generate consistent random attendance for a subject
const generateSubjectAttendance = (subjectName) => {
  // Create a seed from subject name
  let seed = 0;
  for (let i = 0; i < subjectName.length; i++) {
    seed += subjectName.charCodeAt(i);
  }
  seed = (seed % 100) / 100;

  // Generate total classes (between 40-52)
  const total = getRandomInRange(40, 52, seed);

  // Generate attended (between 80-95% of total)
  const minAttended = Math.ceil(total * 0.80);
  const maxAttended = Math.ceil(total * 0.95);
  const attended = getRandomInRange(minAttended, maxAttended, seed * 2);

  const pct = Math.round((attended / total) * 100);

  return { attended, total, pct };
};

// Main function to generate attendance data from subjects/labs
export const generateDummyAttendance = (subjects = [], labs = []) => {
  const allItems = [...subjects, ...labs];

  if (allItems.length === 0) {
    // Fallback if no subjects
    return generateDefaultAttendance();
  }

  return allItems.map(name => {
    const { attended, total, pct } = generateSubjectAttendance(name);
    return {
      subject: name,
      attended,
      total,
      pct,
      ratio: `${attended}/${total}`,
      type: labs.includes(name) ? 'Lab' : 'Theory'
    };
  });
};

// Fallback default attendance data
export const generateDefaultAttendance = () => {
  return [
    { subject: 'Data Structures', attended: 45, total: 50, pct: 90, ratio: '45/50', type: 'Theory' },
    { subject: 'Operating Systems', attended: 34, total: 40, pct: 85, ratio: '34/40', type: 'Theory' },
    { subject: 'Discrete Mathematics', attended: 38, total: 40, pct: 95, ratio: '38/40', type: 'Theory' },
    { subject: 'Database Management', attended: 44, total: 50, pct: 88, ratio: '44/50', type: 'Theory' },
    { subject: 'Computer Networks', attended: 46, total: 50, pct: 92, ratio: '46/50', type: 'Theory' },
  ];
};

// Calculate overall attendance percentage
export const calculateOverallAttendance = (attendanceData = []) => {
  if (attendanceData.length === 0) return 88;

  const totalAttended = attendanceData.reduce((sum, item) => sum + item.attended, 0);
  const totalClasses = attendanceData.reduce((sum, item) => sum + item.total, 0);

  return totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 88;
};
