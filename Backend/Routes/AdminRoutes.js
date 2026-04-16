const express = require("express");
const router = express.Router();
const Admin = require("../Models/Admin");
const SecurityLog = require("../Models/SecurityLog");
const { checkUploadPermission } = require("../Middleware/permissionCheck");

const buildSecurityFilter = (query) => {
  const { status, type, search } = query;
  const filter = {};

  if (status && status !== "All") filter.status = status;
  if (type && type !== "All Types") filter.type = type;

  const searchText = String(search || "").trim();
  if (searchText) {
    const rx = new RegExp(searchText, "i");
    filter.$or = [
      { action: rx },
      { actor: rx },
      { ip: rx },
      { route: rx },
      { method: rx },
    ];
  }

  return filter;
};

// ─────────────────────────────────────────────────────────────
// GET DASHBOARD STATISTICS
// GET /api/admins/dashboard/stats
// ─────────────────────────────────────────────────────────────
router.get("/dashboard/stats", async (req, res) => {
  try {
    const Student = require("../Models/Student");
    const Teacher = require("../Models/Teacher");
    const Parent = require("../Models/Parent");

    const [studentsCount, teachersCount, adminsCount, parentsCount] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Admin.countDocuments(),
      Parent.countDocuments(),
    ]);

    const totalUsers = studentsCount + teachersCount + adminsCount + parentsCount;
    const staffCount = teachersCount + adminsCount;

    res.json({
      success: true,
      data: {
        totalUsers,
        students: studentsCount,
        faculty: teachersCount,
        staff: staffCount,
        admins: adminsCount,
        parents: parentsCount,
      },
    });
  } catch (error) {
    console.error("GET /admins/dashboard/stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
});

// GET ALL ADMINS
router.get("/", async (req, res) => {
  try {
    const admins = await Admin.find({}).select("-password").lean();
    res.json({ success: true, data: admins, count: admins.length });
  } catch (error) {
    console.error("GET /admins error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/security-logs", async (req, res) => {
  try {
    const filter = buildSecurityFilter(req.query);
    const logs = await SecurityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("GET /admins/security-logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch security logs",
    });
  }
});

router.get("/security-logs/summary", async (req, res) => {
  try {
    const filter = buildSecurityFilter(req.query);
    const logs = await SecurityLog.find(filter)
      .select("status type")
      .lean();

    const summary = {
      total: logs.length,
      success: logs.filter((l) => l.status === "Success").length,
      warning: logs.filter((l) => l.status === "Warning").length,
      failed: logs.filter((l) => l.status === "Failed").length,
      threats: logs.filter((l) => l.type === "Threat").length,
    };

    res.json(summary);
  } catch (error) {
    console.error("GET /admins/security-logs/summary error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch security logs summary",
    });
  }
});

// 🔥 Upload Admins (JSON Array)
router.post("/upload", checkUploadPermission("Admin"), async (req, res) => {
  try {
    const admins = req.body;

    if (!Array.isArray(admins)) {
      return res.status(400).json({
        message: "Expected an array of admins"
      });
    }

    const inserted = await Admin.insertMany(admins, {
      ordered: false
    });

    res.status(201).json({
      message: "Admins uploaded successfully",
      count: inserted.length
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// ADD NEW INSTITUTE (without admin credentials)
// POST /api/admins/add-institute
// ─────────────────────────────────────────────────────────────
router.post("/add-institute", async (req, res) => {
  try {
    const {
      instituteName,
      instituteAddress,
      institutePhone,
      instituteEmail,
      pricePerMonth
    } = req.body;

    if (!instituteName || !pricePerMonth) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: instituteName, pricePerMonth"
      });
    }

    // Create a temporary institute admin entry (without password for now)
    // This will be updated when first department is added
    const bcrypt = require("bcryptjs");
    const tempPassword = await bcrypt.hash(Math.random().toString(36).substring(2, 15), 10);

    const newInstitute = new Admin({
      id: `inst_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      email: instituteEmail || `institute_${Date.now()}@temp.local`,
      password: tempPassword,
      role: 'institute_admin',
      instituteName: instituteName,
      instituteAddress: instituteAddress || '',
      institutePhone: institutePhone || '',
      instituteEmail: instituteEmail || '',
      pricePerMonth: Number(pricePerMonth),
      isActive: true
    });

    await newInstitute.save();

    const SecurityLog = require("../Models/SecurityLog");
    await SecurityLog.create({
      actor: req.user?.id || 'System',
      action: `New institute created: ${instituteName}`,
      type: "System",
      status: "Success",
      ip: req.ip,
      route: "/api/admins/add-institute",
      method: "POST"
    });

    res.status(201).json({
      success: true,
      message: "Institute created successfully",
      data: {
        _id: newInstitute._id,
        id: newInstitute.id,
        instituteName: newInstitute.instituteName,
        instituteAddress: newInstitute.instituteAddress,
        institutePhone: newInstitute.institutePhone,
        instituteEmail: newInstitute.instituteEmail,
        pricePerMonth: newInstitute.pricePerMonth,
        createdAt: newInstitute.createdAt,
        departments: []
      }
    });
  } catch (error) {
    console.error("POST /admins/add-institute error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create institute",
      error: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// ADD DEPARTMENT TO INSTITUTE
// POST /api/admins/add-department
// ─────────────────────────────────────────────────────────────
router.post("/add-department", async (req, res) => {
  try {
    const {
      instituteId,
      departmentName,
      adminId,
      adminEmail,
      adminPassword
    } = req.body;

    console.log('📥 POST /add-department received:', {
      instituteId,
      departmentName,
      adminId,
      adminEmail,
      adminPassword: '***'
    });

    if (!instituteId || !departmentName || !adminId || !adminEmail || !adminPassword) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: instituteId, departmentName, adminId, adminEmail, adminPassword"
      });
    }

    // Validate password length
    if (adminPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Check if institute exists (try both _id and id field)
    console.log('🔍 Looking up institute with ID:', instituteId);
    let institute = await Admin.findById(instituteId);
    console.log('📊 FindById result:', institute ? `Found institute: ${institute.id}` : 'Not found by _id');
    
    if (!institute) {
      institute = await Admin.findOne({ id: instituteId });
      console.log('📊 FindOne result:', institute ? `Found institute: ${institute._id}` : 'Not found by id');
    }
    
    if (!institute || institute.role !== 'institute_admin') {
      console.log('❌ Institute not found or not institute_admin role');
      return res.status(404).json({
        success: false,
        message: "Institute not found or invalid institute ID"
      });
    }

    console.log('✅ Institute found:', {
      _id: institute._id,
      id: institute.id,
      instituteName: institute.instituteName
    });

    // Check if department with same admin ID already exists in this institute
    const existingDept = institute.departments?.find(d => d.adminId === adminId);
    if (existingDept) {
      console.log('⚠️  Admin ID already exists in this institute:', adminId);
      return res.status(409).json({
        success: false,
        message: "Admin ID already exists in this institute. Please use a different ID."
      });
    }

    // Check if department with same admin email already exists in this institute
    const existingDeptEmail = institute.departments?.find(d => d.adminEmail === adminEmail);
    if (existingDeptEmail) {
      console.log('⚠️  Admin email already exists in this institute:', adminEmail);
      return res.status(409).json({
        success: false,
        message: "Admin email already exists in this institute. Please use a different email."
      });
    }

    // Hash password
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create department object and push to institute's departments array
    const newDept = {
      departmentName,
      departmentCode: `dept_${adminId}`,
      adminId,
      adminEmail,
      adminPassword: hashedPassword,
      isActive: true,
      createdAt: new Date()
    };

    console.log('💾 Pushing department to institute:', institute.id);
    institute.departments.push(newDept);
    await institute.save();
    
    console.log('✅ Department saved successfully to institute:', {
      instituteName: institute.instituteName,
      departmentName: newDept.departmentName,
      adminId: newDept.adminId,
      totalDepartments: institute.departments.length
    });

    // Log the action
    const SecurityLog = require("../Models/SecurityLog");
    await SecurityLog.create({
      actor: req.user?.id || 'System',
      action: `New department created: ${departmentName} under ${institute.instituteName}`,
      type: "System",
      status: "Success",
      ip: req.ip,
      route: "/api/admins/add-department",
      method: "POST"
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: {
        instituteName: institute.instituteName,
        departmentName: newDept.departmentName,
        adminId: newDept.adminId,
        adminEmail: newDept.adminEmail,
        departmentCode: newDept.departmentCode,
        createdAt: newDept.createdAt,
        totalDepartments: institute.departments.length
      }
    });
  } catch (error) {
    console.error("❌ POST /admins/add-department error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create department",
      error: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT UPDATE DEPARTMENT
// PUT /api/admins/institutes/:instituteId/departments/:deptId
// ─────────────────────────────────────────────────────────────
router.put("/institutes/:instituteId/departments/:deptId", async (req, res) => {
  try {
    const { instituteId, deptId } = req.params;
    const {
      departmentName,
      adminId,
      adminEmail,
      adminPassword
    } = req.body;

    console.log('📥 PUT /update-department received:', {
      instituteId,
      deptId,
      departmentName,
      adminId,
      adminEmail,
      adminPassword: adminPassword ? '***' : 'not provided'
    });

    // Check if institute exists
    console.log('🔍 Looking up institute with ID:', instituteId);
    let institute = await Admin.findById(instituteId);
    
    if (!institute) {
      institute = await Admin.findOne({ id: instituteId });
    }
    
    if (!institute || institute.role !== 'institute_admin') {
      console.log('❌ Institute not found or not institute_admin role');
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    console.log('✅ Institute found:', institute.instituteName);

    // Find the department to update
    const deptIndex = institute.departments?.findIndex(d => 
      d._id?.toString() === deptId || d.departmentCode === deptId
    );

    if (deptIndex === -1 || deptIndex === undefined) {
      console.log('❌ Department not found:', deptId);
      return res.status(404).json({
        success: false,
        message: "Department not found in this institute"
      });
    }

    console.log('✅ Department found at index:', deptIndex);

    const department = institute.departments[deptIndex];

    // Validate provided fields
    if (departmentName) {
      department.departmentName = departmentName;
    }

    if (adminId) {
      // Check if new adminId already exists in other departments
      const duplicateAdminId = institute.departments?.findIndex((d, idx) => 
        idx !== deptIndex && d.adminId === adminId
      );
      if (duplicateAdminId !== -1) {
        console.log('⚠️  Admin ID already exists in another department:', adminId);
        return res.status(409).json({
          success: false,
          message: "Admin ID already exists in another department"
        });
      }
      department.adminId = adminId;
      department.departmentCode = `dept_${adminId}`;
    }

    if (adminEmail) {
      // Check if new email already exists in other departments
      const duplicateEmail = institute.departments?.findIndex((d, idx) => 
        idx !== deptIndex && d.adminEmail === adminEmail
      );
      if (duplicateEmail !== -1) {
        console.log('⚠️  Email already exists in another department:', adminEmail);
        return res.status(409).json({
          success: false,
          message: "Email already exists in another department"
        });
      }
      department.adminEmail = adminEmail;
    }

    // Only hash password if provided
    if (adminPassword) {
      if (adminPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters"
        });
      }
      const bcrypt = require("bcryptjs");
      department.adminPassword = await bcrypt.hash(adminPassword, 10);
    }

    console.log('💾 Saving updated department');
    await institute.save();
    
    console.log('✅ Department updated successfully');

    // Log the action
    const SecurityLog = require("../Models/SecurityLog");
    await SecurityLog.create({
      actor: req.user?.id || 'System',
      action: `Department updated: ${department.departmentName} in ${institute.instituteName}`,
      type: "System",
      status: "Success",
      ip: req.ip,
      route: "/api/admins/institutes/:instituteId/departments/:deptId",
      method: "PUT"
    });

    res.json({
      success: true,
      message: "Department updated successfully",
      data: {
        instituteName: institute.instituteName,
        departmentName: department.departmentName,
        adminId: department.adminId,
        adminEmail: department.adminEmail,
        departmentCode: department.departmentCode
      }
    });
  } catch (error) {
    console.error("❌ PUT /update-department error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update department",
      error: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// GET ALL INSTITUTES WITH DEPARTMENTS
// GET /api/admins/get-institutes
// ─────────────────────────────────────────────────────────────
router.get("/get-institutes", async (req, res) => {
  try {
    console.log('📥 GET /get-institutes called');
    const institutes = await Admin.find({ role: 'institute_admin' })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`📊 Found ${institutes.length} institutes`);

    // Log departments for each institute
    institutes.forEach((institute) => {
      console.log(`🏫 ${institute.instituteName}`);
      if (institute.departments && institute.departments.length > 0) {
        console.log(`  └─ Departments: ${institute.departments.length}`);
        institute.departments.forEach(d => {
          console.log(`    ├─ ${d.departmentName} (admin: ${d.adminId})`);
        });
      } else {
        console.log(`  └─ No departments yet`);
      }
    });

    console.log('✅ GET /get-institutes completed successfully');
    res.json({
      success: true,
      data: institutes,
      count: institutes.length
    });
  } catch (error) {
    console.error("❌ GET /admins/get-institutes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch institutes",
      error: error.message
    });
  }
});

router.get("/institutes/:id", async (req, res) => {
  try {
    const institute = await Admin.findOne({ 
      _id: req.params.id,
      role: 'institute_admin' 
    }).select('-password').lean();

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    res.json({
      success: true,
      data: {
        ...institute,
        departmentCount: institute.departments?.length || 0
      }
    });
  } catch (error) {
    console.error("GET /admins/institutes/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch institute",
      error: error.message
    });
  }
});

router.put("/institutes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      instituteName,
      instituteAddress,
      institutePhone,
      instituteEmail,
      pricePerMonth,
      email
    } = req.body;

    const institute = await Admin.findOne({ _id: id, role: 'institute_admin' });
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    if (email && email !== institute.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: institute._id } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another admin"
        });
      }
    }

    const updatedInstitute = await Admin.findOneAndUpdate(
      { _id: id, role: 'institute_admin' },
      {
        instituteName: instituteName || institute.instituteName,
        instituteAddress: instituteAddress || institute.instituteAddress,
        institutePhone: institutePhone || institute.institutePhone,
        instituteEmail: instituteEmail || institute.instituteEmail,
        pricePerMonth: pricePerMonth !== undefined ? pricePerMonth : institute.pricePerMonth,
        email: email || institute.email
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: "Institute updated successfully",
      data: updatedInstitute
    });
  } catch (error) {
    console.error("PUT /admins/institutes/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update institute",
      error: error.message
    });
  }
});

router.delete("/institutes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the institute (departments are nested, so they'll be deleted with it)
    const institute = await Admin.findOne({ 
      _id: id, 
      role: 'institute_admin' 
    });

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    await Admin.findOneAndDelete({ 
      _id: id, 
      role: 'institute_admin' 
    });

    res.json({
      success: true,
      message: "Institute and all its departments deleted successfully"
    });
  } catch (error) {
    console.error("DELETE /admins/institutes/:id error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete institute",
      error: error.message
    });
  }
});

router.post("/institutes/:id/reset-password", async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    const institute = await Admin.findOne({ _id: id, role: 'institute_admin' });
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    institute.password = hashedPassword;
    await institute.save();

    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("POST /admins/institutes/:id/reset-password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message
    });
  }
});

// ─────────────────────────────────────────────────────────────
// DEPARTMENT MANAGEMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────

// GET ALL DEPARTMENTS FOR AN INSTITUTE
router.get("/departments/:instituteId", async (req, res) => {
  try {
    const { instituteId } = req.params;

    const institute = await Admin.findById(instituteId);
    if (!institute || institute.role !== 'institute_admin') {
      return res.status(404).json({
        success: false,
        message: "Institute not found"
      });
    }

    const departments = await Admin.find({
      parentInstituteAdminId: institute.id,
      role: 'department_admin'
    }).select('-password').lean();

    res.json({
      success: true,
      data: departments,
      count: departments.length
    });
  } catch (error) {
    console.error("GET /admins/departments/:instituteId error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
      error: error.message
    });
  }
});

// GET SINGLE DEPARTMENT
router.get("/department/:deptId", async (req, res) => {
  try {
    const { deptId } = req.params;

    const department = await Admin.findById(deptId)
      .select('-password')
      .lean();

    if (!department || department.role !== 'department_admin') {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error("GET /admins/department/:deptId error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch department",
      error: error.message
    });
  }
});

// UPDATE DEPARTMENT
router.put("/department/:deptId", async (req, res) => {
  try {
    const { deptId } = req.params;
    const { departmentName, email } = req.body;

    const department = await Admin.findById(deptId);
    if (!department || department.role !== 'department_admin') {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    if (email && email !== department.email) {
      const existingEmail = await Admin.findOne({ email, _id: { $ne: department._id } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "Email already in use"
        });
      }
    }

    const updatedDepartment = await Admin.findByIdAndUpdate(
      deptId,
      {
        departmentName: departmentName || department.departmentName,
        email: email || department.email
      },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: "Department updated successfully",
      data: updatedDepartment
    });
  } catch (error) {
    console.error("PUT /admins/department/:deptId error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update department",
      error: error.message
    });
  }
});

// DELETE DEPARTMENT
router.delete("/department/:deptId", async (req, res) => {
  try {
    const { deptId } = req.params;

    const department = await Admin.findById(deptId);
    if (!department || department.role !== 'department_admin') {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    await Admin.findByIdAndDelete(deptId);

    res.json({
      success: true,
      message: "Department deleted successfully"
    });
  } catch (error) {
    console.error("DELETE /admins/department/:deptId error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete department",
      error: error.message
    });
  }
});

// RESET DEPARTMENT ADMIN PASSWORD
router.post("/department/:deptId/reset-password", async (req, res) => {
  try {
    const { deptId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    const department = await Admin.findById(deptId);
    if (!department || department.role !== 'department_admin') {
      return res.status(404).json({
        success: false,
        message: "Department not found"
      });
    }

    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    department.password = hashedPassword;
    await department.save();

    res.json({
      success: true,
      message: "Department password reset successfully"
    });
  } catch (error) {
    console.error("POST /admins/department/:deptId/reset-password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message
    });
  }
});

// CLASS TEACHER ASSIGNMENT ENDPOINTS
router.post("/class-teacher/assign", async (req, res) => {
  try {
    const { teacherId, year, division } = req.body;

    if (!teacherId || !year || !division) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: teacherId, year, division"
      });
    }

    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        message: `Invalid year. Must be one of: ${validYears.join(", ")}`
      });
    }

    const validDivisions = ["A", "B", "C"];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({
        success: false,
        message: `Invalid division. Must be one of: ${validDivisions.join(", ")}`
      });
    }

    const Teacher = require("../Models/Teacher");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    const existingAssignment = await Teacher.findOne({
      "classTeacher.year": year,
      "classTeacher.division": division,
      _id: { $ne: teacherId }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: `This class is already assigned to ${existingAssignment.name}. Please unassign first.`
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        classTeacher: {
          year,
          division,
          assignedAt: new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Class teacher assigned successfully",
      data: {
        teacherId: updatedTeacher._id,
        teacherName: updatedTeacher.name,
        year,
        division,
        assignedAt: updatedTeacher.classTeacher.assignedAt
      }
    });
  } catch (error) {
    console.error("POST /admins/class-teacher/assign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign class teacher",
      error: error.message
    });
  }
});

router.put("/class-teacher/update/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { year, division } = req.body;

    if (!year || !division) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: year, division"
      });
    }

    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        message: `Invalid year. Must be one of: ${validYears.join(", ")}`
      });
    }

    const validDivisions = ["A", "B", "C"];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({
        success: false,
        message: `Invalid division. Must be one of: ${validDivisions.join(", ")}`
      });
    }

    const Teacher = require("../Models/Teacher");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    const existingAssignment = await Teacher.findOne({
      "classTeacher.year": year,
      "classTeacher.division": division,
      _id: { $ne: teacherId }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        message: `This class is already assigned to ${existingAssignment.name}. Please unassign first.`
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        classTeacher: {
          year,
          division,
          assignedAt: new Date()
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Class teacher updated successfully",
      data: {
        teacherId: updatedTeacher._id,
        teacherName: updatedTeacher.name,
        year,
        division,
        assignedAt: updatedTeacher.classTeacher.assignedAt
      }
    });
  } catch (error) {
    console.error("PUT /admins/class-teacher/update error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update class teacher",
      error: error.message
    });
  }
});

router.delete("/class-teacher/unassign/:teacherId", async (req, res) => {
  try {
    const { teacherId } = req.params;

    const Teacher = require("../Models/Teacher");
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found"
      });
    }

    if (!teacher.classTeacher.year || !teacher.classTeacher.division) {
      return res.status(400).json({
        success: false,
        message: "This teacher has no class assignment to unassign"
      });
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacherId,
      {
        classTeacher: {
          year: null,
          division: null,
          assignedAt: null
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Class teacher unassigned successfully",
      data: {
        teacherId: updatedTeacher._id,
        teacherName: updatedTeacher.name
      }
    });
  } catch (error) {
    console.error("DELETE /admins/class-teacher/unassign error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unassign class teacher",
      error: error.message
    });
  }
});

router.get("/class-teacher/assignments", async (req, res) => {
  try {
    const Teacher = require("../Models/Teacher");
    const assignments = await Teacher.find({
      "classTeacher.year": { $ne: null },
      "classTeacher.division": { $ne: null }
    }).select("id name classTeacher").lean();

    const groupedAssignments = {};
    const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    const DIVISIONS = ["A", "B", "C"];

    YEARS.forEach(year => {
      groupedAssignments[year] = {};
      DIVISIONS.forEach(div => {
        groupedAssignments[year][div] = null;
      });
    });

    assignments.forEach(teacher => {
      const { year, division } = teacher.classTeacher;
      if (groupedAssignments[year]) {
        groupedAssignments[year][division] = {
          teacherId: teacher._id,
          teacherName: teacher.name,
          year,
          division,
          assignedAt: teacher.classTeacher.assignedAt
        };
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalAssignments: assignments.length,
        assignments: groupedAssignments,
        list: assignments
      }
    });
  } catch (error) {
    console.error("GET /admins/class-teacher/assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch class teacher assignments",
      error: error.message
    });
  }
});

router.get("/class-teacher/byYear/:year/:division", async (req, res) => {
  try {
    const { year, division } = req.params;

    const validYears = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
    if (!validYears.includes(year)) {
      return res.status(400).json({
        success: false,
        message: `Invalid year. Must be one of: ${validYears.join(", ")}`
      });
    }

    const validDivisions = ["A", "B", "C"];
    if (!validDivisions.includes(division)) {
      return res.status(400).json({
        success: false,
        message: `Invalid division. Must be one of: ${validDivisions.join(", ")}`
      });
    }

    const Teacher = require("../Models/Teacher");
    const assignment = await Teacher.findOne({
      "classTeacher.year": year,
      "classTeacher.division": division
    }).select("id name classTeacher").lean();

    if (!assignment) {
      return res.status(200).json({
        success: true,
        data: null,
        message: `No class teacher assigned for ${year} - Division ${division}`
      });
    }

    res.status(200).json({
      success: true,
      data: {
        teacherId: assignment._id,
        teacherName: assignment.name,
        year,
        division,
        assignedAt: assignment.classTeacher.assignedAt
      }
    });
  } catch (error) {
    console.error("GET /admins/class-teacher/byYear error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch class teacher assignment",
      error: error.message
    });
  }
});

module.exports = router;