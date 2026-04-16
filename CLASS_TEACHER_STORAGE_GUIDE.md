# Class Teacher Assignment - Complete Implementation Guide

## 🎯 Overview

When a teacher is assigned as a **Class Teacher** for a specific year and division, the assignment is **automatically stored to the MongoDB database** in the Teacher document.

---

## 📊 Data Storage Schema

### Teacher Model Structure
```javascript
// Backend/Models/Teacher.js
classTeacher: {
  year: {
    type: String,
    enum: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    default: null,
  },
  division: {
    type: String,
    enum: ["A", "B", "C"],
    default: null,
  },
  assignedAt: {
    type: Date,
    default: null,
  },
}
```

**Example Database Record:**
```json
{
  "_id": "ObjectId(...)",
  "id": "T001",
  "name": "Dr. Deepika Sharma",
  "classTeacher": {
    "year": "1st Year",
    "division": "A",
    "assignedAt": "2026-04-15T10:30:00.000Z"
  }
}
```

---

## 🔄 Complete Assignment Flow

### Step 1: Frontend - User Selects Teacher
📍 **File**: `Frontend/Screens/Admin/FacultyAssignment/FacultyAssign.js`

```javascript
// User clicks "Assign" button in the modal
handleAssign = (selectedYear, selectedDiv, teacher) => {
  // Modal passes data to parent component
  onAssign(selectedYear, selectedDiv, teacher);
}
```

### Step 2: Frontend - API Request
📍 **Function**: `handleAssignCT()`

```javascript
const handleAssignCT = async (year, div, teacher) => {
  try {
    // ✅ Send POST request with MongoDB ObjectId
    const response = await axiosInstance.post('/teachers/assign-class-teacher', {
      year: '1st Year',           // e.g., "1st Year"
      division: 'A',              // e.g., "A"
      teacherId: teacher._id,     // ✅ MongoDB ObjectId (NOT custom id)
    });

    if (response.data?.success) {
      // ✅ Update local state
      setCtAssignments(prev => ({
        ...prev,
        ['1st Year-A']: { 
          name: teacher.name,
          teacherId: teacher._id
        },
      }));

      // ✅ Show success alert
      Alert.alert('✅ Success', `${teacher.name} assigned as Class Teacher`);

      // ✅ Refetch to verify database persistence
      setTimeout(() => {
        axiosInstance.get('/teachers/class-teachers').then(res => {
          // Update with fresh data from DB
          setCtAssignments(res.data.assignments);
        });
      }, 500);
    }
  } catch (error) {
    Alert.alert('❌ Error', error.message);
  }
};
```

### Step 3: Backend - API Receives Request
📍 **Endpoint**: `POST /api/teachers/assign-class-teacher`
📍 **File**: `Backend/Routes/TeacherRoutes.js` (Lines 265-336)

```javascript
router.post("/assign-class-teacher", async (req, res) => {
  const { teacherId, year, division } = req.body;

  // 1️⃣ Validation
  const VALID_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
  const VALID_DIVS = ["A", "B", "C"];
  
  // ... validation checks ...

  // 2️⃣ Find teacher by MongoDB _id
  const newCT = await Teacher.findById(teacherId);
  if (!newCT) {
    return res.status(404).json({ success: false, message: "Teacher not found" });
  }

  // 3️⃣ Clear existing assignment for this year/division
  await Teacher.updateMany(
    {
      _id: { $ne: newCT._id },
      "classTeacher.year": year,
      "classTeacher.division": division,
    },
    {
      $set: {
        "classTeacher.year": null,
        "classTeacher.division": null,
        "classTeacher.assignedAt": null,
      },
    }
  );

  // 4️⃣ Assign to new teacher
  newCT.classTeacher = { 
    year, 
    division, 
    assignedAt: new Date() 
  };
  
  // 5️⃣ ✅ SAVE TO DATABASE
  await newCT.save();  // ← This writes to MongoDB!

  // 6️⃣ Return success response
  res.status(200).json({
    success: true,
    message: `${newCT.name} assigned as Class Teacher for ${year} Division ${division}.`,
    data: {
      teacherId: newCT._id,
      name: newCT.name,
      year,
      division,
      assignedAt: newCT.classTeacher.assignedAt,
    },
  });
});
```

### Step 4: Backend - Database Save
📍 **Database**: MongoDB Collection: `teachers`

```
✅ Teacher Document Updated:
{
  "_id": ObjectId("..."),
  "id": "T001",
  "name": "Dr. Deepika Sharma",
  "classTeacher": {
    "year": "1st Year",      ← ✅ STORED
    "division": "A",         ← ✅ STORED
    "assignedAt": 2026-04-15T10:30:00Z  ← ✅ STORED
  },
  "updatedAt": 2026-04-15T10:30:00Z
}
```

### Step 5: Frontend - Verification
📍 **Endpoint**: `GET /api/teachers/class-teachers`

```javascript
// Frontend refetches to verify assignment was saved
Response:
{
  "success": true,
  "assignments": {
    "1st Year-A": {
      "name": "Dr. Deepika Sharma",
      "teacherId": ObjectId("..."),
      "assignedAt": "2026-04-15T10:30:00.000Z"
    }
  }
}
```

---

## 🧪 How to Test

### Option 1: Use the Test Script (Recommended)
```bash
cd Backend
node test-class-teacher-assignment.js
```

This script will:
1. ✅ Fetch all teachers
2. ✅ Assign the first teacher to 1st Year Division A
3. ✅ Verify the assignment was saved to the database
4. ✅ Show detailed results

### Option 2: Manual Testing with Postman/curl

**1. Get a teacher ID:**
```bash
curl http://localhost:5000/api/teachers/all
```

**2. Assign that teacher:**
```bash
curl -X POST http://localhost:5000/api/teachers/assign-class-teacher \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId": "PASTE_TEACHER_ID_HERE",
    "year": "1st Year",
    "division": "A"
  }'
```

**3. Verify assignment was saved:**
```bash
curl http://localhost:5000/api/teachers/class-teachers
```

**4. Check individual teacher:**
```bash
curl http://localhost:5000/api/teachers/PASTE_TEACHER_ID_HERE
```

---

## ✨ Key Features

| Feature | Status | Details |
|---------|--------|---------|
| **Save to Database** | ✅ | Stored in Teacher.classTeacher field |
| **Prevent Duplicates** | ✅ | Only one CT per year/division |
| **Timestamp Recording** | ✅ | assignedAt stores when assignment happened |
| **Persistence** | ✅ | Data survives page refresh |
| **Error Handling** | ✅ | Clear error messages if assignment fails |
| **Verification** | ✅ | Frontend verifies via GET endpoint |

---

## 🐛 Troubleshooting

### Issue: Assignment shows success but doesn't persist after refresh

**Solution**: Check that:
1. Backend server is running (`npm start` or `node Server.js`)
2. MongoDB connection is active
3. Teacher._id is being sent (not custom id)
4. Backend returns `success: true`

### Issue: "Teacher not found" error

**Solution**:
- Verify the `teacherId` is a valid MongoDB ObjectId from the database
- Check that you're using `teacher._id` NOT `teacher.id`

### Issue: API returns 500 error

**Solution**:
- Check backend console for error message
- Verify Teacher model has classTeacher schema
- Ensure MongoDB is connected

---

## 📁 Related Files

- 📄 **Model**: `Backend/Models/Teacher.js`
- 🛣️ **Routes**: `Backend/Routes/TeacherRoutes.js` (lines 265-336 for assignment)
- 🎨 **Frontend**: `Frontend/Screens/Admin/FacultyAssignment/FacultyAssign.js` (handleAssignCT function)
- 🧪 **Test**: `Backend/test-class-teacher-assignment.js`

---

## 🎓 Summary

✅ **When a teacher is assigned:**
1. Frontend sends POST `/api/teachers/assign-class-teacher` with teacherId, year, division
2. Backend validates the request
3. Backend finds the teacher by MongoDB _id
4. Backend clears any existing assignment for that year/division
5. Backend sets `teacher.classTeacher = { year, division, assignedAt: new Date() }`
6. Backend calls `await teacher.save()` → **✅ DATA SAVED TO MONGODB**
7. Frontend receives success response
8. Frontend updates UI and refetches to verify

**The assignment IS stored to the database automatically!** 🎉
