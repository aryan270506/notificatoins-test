const express = require('express');
const router = express.Router();
const Subject = require('../Models/Subject');
const Fees = require('../Models/Fees');
const auth = require('../Middleware/auth');

function resolveAdminScope(req) {
  const user = req.user || {};

  if (String(user.role || '').toLowerCase() !== 'admin') {
    return { error: 'Only admin users can manage configuration.' };
  }

  if (!user.instituteId) {
    return { error: 'Institute scope not found in token. Please login again.' };
  }

  return {
    instituteId: String(user.instituteId),
    instituteName: String(user.instituteName || '').trim(),
    departmentCode: String(user.departmentCode || '__INSTITUTE__').trim(),
    departmentName: String(user.departmentName || 'Institute').trim(),
  };
}

let scopedIndexMigrationDone = false;
async function ensureScopedIndexes() {
  if (scopedIndexMigrationDone) return;

  const [subjectIndexes, feesIndexes] = await Promise.all([
    Subject.collection.indexes(),
    Fees.collection.indexes(),
  ]);

  const legacySubjectYearIndex = subjectIndexes.find((idx) => idx?.name === 'year_1' && idx?.unique);
  if (legacySubjectYearIndex) {
    console.log('🛠 Dropping legacy Subject unique index: year_1');
    await Subject.collection.dropIndex('year_1');
  }

  const legacyFeesYearIndex = feesIndexes.find((idx) => idx?.name === 'year_1' && idx?.unique);
  if (legacyFeesYearIndex) {
    console.log('🛠 Dropping legacy Fees unique index: year_1');
    await Fees.collection.dropIndex('year_1');
  }

  await Subject.collection.createIndex(
    { year: 1, instituteId: 1, departmentCode: 1 },
    { unique: true, name: 'year_1_instituteId_1_departmentCode_1' }
  );

  await Fees.collection.createIndex(
    { year: 1, instituteId: 1, departmentCode: 1 },
    { unique: true, name: 'year_1_instituteId_1_departmentCode_1' }
  );

  scopedIndexMigrationDone = true;
}

// Save Configuration (Subjects, Labs, Fees)
router.post('/configuration/save', auth, async (req, res) => {
  try {
    const { subjects, labs, fees } = req.body;
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    await ensureScopedIndexes();

    console.log('💾 Saving configuration:', { subjects, labs, fees });

    // Save subjects and labs for each year
    if (subjects || labs) {
      for (let year = 1; year <= 4; year++) {
        const yearStr = String(year);
        const subjectList = subjects?.[`year${year}`] || [];
        const labList = labs?.[`year${year}`] || [];

        await Subject.findOneAndUpdate(
          {
            year: yearStr,
            instituteId: scope?.instituteId,
            departmentCode: scope?.departmentCode,
          },
          {
            year: yearStr,
            instituteId: scope?.instituteId,
            instituteName: scope?.instituteName,
            departmentCode: scope?.departmentCode,
            departmentName: scope?.departmentName,
            subjects: subjectList,
            labs: labList,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );
      }
    }

    // Save fees for each year
    if (fees) {
      for (let year = 1; year <= 4; year++) {
        const yearStr = String(year);
        const amount = fees[`year${year}`];

        if (amount !== undefined && amount !== null) {
          await Fees.findOneAndUpdate(
            {
              year: yearStr,
              instituteId: scope?.instituteId,
              departmentCode: scope?.departmentCode,
            },
            {
              year: yearStr,
              instituteId: scope?.instituteId,
              instituteName: scope?.instituteName,
              departmentCode: scope?.departmentCode,
              departmentName: scope?.departmentName,
              amount: parseFloat(amount),
              currency: 'INR',
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Configuration saved successfully',
      data: { subjects, labs, fees },
    });
  } catch (error) {
    console.error('❌ Error saving configuration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save configuration',
      error: error.message,
    });
  }
});

// Get all subjects by year
router.get('/subjects/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    const subject = await Subject.findOne({
      year,
      instituteId: scope?.instituteId,
      departmentCode: scope?.departmentCode,
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: `No subjects found for year ${year}`,
      });
    }

    res.json({
      success: true,
      data: subject,
    });
  } catch (error) {
    console.error('❌ Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message,
    });
  }
});

// Get all subjects
router.get('/subjects', auth, async (req, res) => {
  try {
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    const subjects = await Subject.find({
      instituteId: scope?.instituteId,
      departmentCode: scope?.departmentCode,
    }).sort({ year: 1 });

    res.json({
      success: true,
      data: subjects,
    });
  } catch (error) {
    console.error('❌ Error fetching all subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subjects',
      error: error.message,
    });
  }
});

// Get fees by year
router.get('/fees/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    const fees = await Fees.findOne({
      year,
      instituteId: scope?.instituteId,
      departmentCode: scope?.departmentCode,
    });

    if (!fees) {
      return res.status(404).json({
        success: false,
        message: `No fees found for year ${year}`,
      });
    }

    res.json({
      success: true,
      data: fees,
    });
  } catch (error) {
    console.error('❌ Error fetching fees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fees',
      error: error.message,
    });
  }
});

// Get all fees
router.get('/fees', auth, async (req, res) => {
  try {
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    const fees = await Fees.find({
      instituteId: scope?.instituteId,
      departmentCode: scope?.departmentCode,
    }).sort({ year: 1 });

    res.json({
      success: true,
      data: fees,
    });
  } catch (error) {
    console.error('❌ Error fetching all fees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fees',
      error: error.message,
    });
  }
});

// Update subject for a specific year
router.put('/subjects/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const { subjects, labs } = req.body;
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    await ensureScopedIndexes();

    const updated = await Subject.findOneAndUpdate(
      {
        year,
        instituteId: scope?.instituteId,
        departmentCode: scope?.departmentCode,
      },
      {
        year,
        instituteId: scope?.instituteId,
        instituteName: scope?.instituteName,
        departmentCode: scope?.departmentCode,
        departmentName: scope?.departmentName,
        subjects: subjects || [],
        labs: labs || [],
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Subjects updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('❌ Error updating subjects:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subjects',
      error: error.message,
    });
  }
});

// Update fees for a specific year
router.put('/fees/:year', auth, async (req, res) => {
  try {
    const { year } = req.params;
    const { amount, description } = req.body;
    const scope = resolveAdminScope(req);

    if (scope?.error) {
      return res.status(401).json({ success: false, message: scope.error });
    }

    await ensureScopedIndexes();

    const updated = await Fees.findOneAndUpdate(
      {
        year,
        instituteId: scope?.instituteId,
        departmentCode: scope?.departmentCode,
      },
      {
        year,
        instituteId: scope?.instituteId,
        instituteName: scope?.instituteName,
        departmentCode: scope?.departmentCode,
        departmentName: scope?.departmentName,
        amount: parseFloat(amount),
        description: description || '',
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Fees updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('❌ Error updating fees:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update fees',
      error: error.message,
    });
  }
});

module.exports = router;