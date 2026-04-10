const express = require('express');
const router = express.Router();
const Subject = require('../Models/Subject');
const Fees = require('../Models/Fees');

// Save Configuration (Subjects, Labs, Fees)
router.post('/configuration/save', async (req, res) => {
  try {
    const { subjects, labs, fees } = req.body;

    console.log('💾 Saving configuration:', { subjects, labs, fees });

    // Save subjects and labs for each year
    if (subjects || labs) {
      for (let year = 1; year <= 4; year++) {
        const yearStr = String(year);
        const subjectList = subjects?.[`year${year}`] || [];
        const labList = labs?.[`year${year}`] || [];

        await Subject.findOneAndUpdate(
          { year: yearStr },
          {
            year: yearStr,
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
            { year: yearStr },
            {
              year: yearStr,
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
router.get('/subjects/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const subject = await Subject.findOne({ year });

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
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ year: 1 });

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
router.get('/fees/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const fees = await Fees.findOne({ year });

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
router.get('/fees', async (req, res) => {
  try {
    const fees = await Fees.find().sort({ year: 1 });

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
router.put('/subjects/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { subjects, labs } = req.body;

    const updated = await Subject.findOneAndUpdate(
      { year },
      {
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
router.put('/fees/:year', async (req, res) => {
  try {
    const { year } = req.params;
    const { amount, description } = req.body;

    const updated = await Fees.findOneAndUpdate(
      { year },
      {
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