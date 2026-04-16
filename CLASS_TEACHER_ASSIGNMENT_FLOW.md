# Class Teacher Assignment - Complete Data Flow

## System Architecture

### **Backend (Express.js + MongoDB)**

#### 1. **Teacher Model** (`Backend/Models/Teacher.js`)
```javascript
classTeacher: {
  year: String,           // "1st Year", "2nd Year", "3rd Year", "4th Year"
  division: String,       // "A", "B", "C"
  assignedAt: Date        // Timestamp of assignment
}
```

#### 2. **Endpoint: POST `/api/teachers/assign-class-teacher`**
- **Request**: `{ teacherId, year, division }`
- **Logic**:
  1. Validate year and division values
  2. Find target teacher by ID
  3. Clear any existing teacher with same year+division combo
  4. Assign new teacher with timestamp
  5. Save to MongoDB
- **Response**: `{ success: true, data: { teacherId, name, year, division, assignedAt } }`
- **Storage**: Document is permanently saved in Teachers collection

#### 3. **Endpoint: GET `/api/teachers/class-teachers`**
- **Purpose**: Fetch all current class teacher assignments
- **Response**: `{ assignments: { "1st Year-A": { name, teacherId, assignedAt }, ... } }`
- **Used by**: Admin View All grid

#### 4. **Endpoint: GET `/api/teachers/:id`**
- **Purpose**: Fetch single teacher profile including class teacher assignment
- **Response**: `{ success: true, data: { ..., classTeacher: { year, division, assignedAt } } }`
- **Used by**: Teacher dashboard to display their assignment

---

## Frontend (React Native)

### **Admin Side - Data Import Center**

#### **TeacherAssignmentModal.js**
```
┌─────────────────────────────────────────────────────┐
│  ADMIN ASSIGNS TEACHER (Assign New Tab)             │
├─────────────────────────────────────────────────────┤
│ 1. Select Year (1-4)                                │
│ 2. Select Division (A, B, C)                        │
│ 3. Search & Select Teacher                          │
│ 4. Click "Assign Teacher" Button                    │
└─────────────────────────────────────────────────────┘
                        ↓
          POST /api/teachers/assign-class-teacher
     { teacherId, year, division }
                        ↓
            Backend saves to MongoDB
                        ↓
        Alert: "✅ Teacher Assigned"
                        ↓
   fetchAssignments() refreshes grid
                        ↓
┌─────────────────────────────────────────────────────┐
│  ADMIN SEES UPDATED GRID (View All Tab)             │
├─────────────────────────────────────────────────────┤
│  Grid fetches: GET /api/teachers/class-teachers     │
│  Shows all assigned teachers in 4x3 grid            │
│  ✓ ASSIGNED [Teacher Name] ID: XXXXX               │
│  Can remove individual assignments                  │
└─────────────────────────────────────────────────────┘
```

---

### **Teacher Side - Dashboard**

#### **MainDash.js**
```
┌─────────────────────────────────────────────────────┐
│  TEACHER DASHBOARD LOADS                            │
├─────────────────────────────────────────────────────┤
│ GET /api/teachers/:teacherId                        │
│ (Firebase/AsyncStorage has teacherId)               │
└─────────────────────────────────────────────────────┘
                        ↓
        Backend returns teacher data:
     {
       name: "John Doe",
       id: "T001",
       classTeacher: {
         year: "1st Year",
         division: "A",
         assignedAt: "2026-04-14T10:30:00Z"
       }
     }
                        ↓
┌─────────────────────────────────────────────────────┐
│  CLASS TEACHER CARD APPEARS                         │
├─────────────────────────────────────────────────────┤
│  👨‍🏫 Class Teacher Assignment                           │
│  ┌──────────────┬──────────────────┐               │
│  │ Year: 1st Y  │  Division: A     │               │
│  └──────────────┴──────────────────┘               │
│  Assigned on Apr 14, 2026                          │
└─────────────────────────────────────────────────────┘
```

---

## Complete Data Flow Diagram

```
ADMIN INTERFACE
    ↓
[Assign Teacher Form] → Select Teacher & Class → Click "Assign"
    ↓
POST /api/teachers/assign-class-teacher
    ↓
┌──────────────────────────────────┐
│  BACKEND PROCESSING              │
│  ├─ Validate inputs              │
│  ├─ Clear old assignment         │
│  ├─ Set new assignment           │
│  └─ Save to MongoDB              │ ← PERSISTENT STORAGE
└──────────────────────────────────┘
    ↓
Success Response → Show Alert
    ↓
┌─────────────────────────────────────────┐
│  ADMIN VIEWS ASSIGNMENT                 │
│  GET /api/teachers/class-teachers       │
│  ├─ Fetches all assignments from DB     │
│  ├─ Displays in 4×3 grid                │
│  └─ Shows teacher names and IDs         │
└─────────────────────────────────────────┘

TEACHER LOGIN
    ↓
[Teacher Dashboard] → Loads MainDash
    ↓
GET /api/teachers/:teacherId
    ↓
┌──────────────────────────────────┐
│  BACKEND RESPONSE                │
│  Queries MongoDB for teacher doc │
│  Returns classTeacher field      │ ← PERSISTENT DATA
└──────────────────────────────────┘
    ↓
[Class Teacher Card] → Displays assignment
    ├─ Year: 1st Year
    ├─ Division: A
    └─ Date: Apr 14, 2026
```

---

## Data Persistence Verification

### **Step 1: Assignment Stored in Backend**
```javascript
// In MongoDB - Teachers Collection
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  id: "T001",
  name: "John Doe",
  password: "hashed_password",
  classTeacher: {
    year: "1st Year",
    division: "A",
    assignedAt: ISODate("2026-04-14T10:30:00.000Z")
  },
  createdAt: ISODate("2025-01-15T..."),
  updatedAt: ISODate("2026-04-14T10:30:00.000Z")
}
```

### **Step 2: Admin Fetches and Displays**
- Route: `GET /api/teachers/class-teachers`
- Returns all teachers with non-null classTeacher
- Displays in "View All" grid
- Can remove assignment (clears the field)

### **Step 3: Teacher Fetches and Displays**
- Route: `GET /api/teachers/:id`
- Returns full teacher document
- Includes `classTeacher` field
- MainDash displays card if assignment exists

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Used By | Data Storage |
|----------|--------|---------|---------|---|
| `/api/teachers/assign-class-teacher` | POST | Create/Update assignment | Admin | ✅ MongoDB |
| `/api/teachers/class-teachers` | GET | Fetch all assignments | Admin | ✅ MongoDB |
| `/api/teachers/class-teachers/:teacherId` | DELETE | Remove assignment | Admin | ✅ MongoDB |
| `/api/teachers/:id` | GET | Fetch teacher profile | Teacher/Admin | ✅ MongoDB |

---

## Features Implemented

✅ **Atomic Operations**: Only one teacher per year-division combo  
✅ **Persistent Storage**: Data saved to MongoDB with timestamps  
✅ **Real-time Sync**: Admin grid updates after assignment  
✅ **Teacher Awareness**: Teachers see their assignment on dashboard  
✅ **Audit Trail**: `assignedAt` timestamp recorded  
✅ **Easy Management**: One-click removal available  
✅ **Data Validation**: Year/division values validated  
✅ **Conflict Resolution**: Auto-unassigns previous teacher  

---

## Current Status

🟢 **FULLY IMPLEMENTED AND WORKING**

All three components are functional:
1. ✅ Admin assigns teacher → Data saved to backend
2. ✅ Admin views assignment → Fetches from backend and displays
3. ✅ Teacher sees assignment → Fetches from backend and displays

The system is production-ready!

---

**Last Updated**: April 14, 2026  
**Version**: 1.0 Complete
