const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
const generateToken = require('../utils/generateToken');

// @desc    Admin Login
// @route   POST /api/auth/admin-login
const adminLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email });
        if (admin && (await bcrypt.compare(password, admin.password))) {
            res.json({
                _id: admin._id,
                name: admin.name,
                role: 'admin',
                profileImage: admin.profileImage,
                email: admin.email,   
                phone: admin.phone,   
                token: generateToken(admin._id, 'admin')
            });
        } else {
            res.status(401).json({ message: "Invalid email or password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Student Login
// @route   POST /api/auth/student-login
// @desc    Student Login
const studentLogin = async (req, res) => {
    const { UID, password } = req.body;
    try {
        const student = await Student.findOne({ UID });

        if (!student || student.accountStatus !== 'active') {
            return res.status(401).json({ message: "Account not active or not found" });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (isMatch) {
            // --- CHANGE THIS SECTION ---
        res.json({
            _id: student._id,
            name: student.name,
            role: 'student',
            class: student.class,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender,
            address: student.address,
            pincode: student.pincode,              
            category: student.category,            
            guardianName: student.guardianName,  
            guardianMobile: student.guardianMobile,  
            fatherName: student.fatherName,
            fatherMobile: student.fatherMobile,
            motherName: student.motherName,
            motherMobile: student.motherMobile,
            parentEmail: student.parentEmail,
            UID: student.UID,
            admissionDate: student.admissionDate,
            academicHistory: student.academicHistory, 
            profileImage: student.profileImage,
            aadharNumber: student.aadharNumber,    // ✅ ADD THIS
            penNumber: student.penNumber,
            token: generateToken(student._id, 'student')
        });
            // ---------------------------
        } else {
            res.status(401).json({ message: "Invalid UID or password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};


// @desc    Teacher Login (Stub - We will create teachers in Phase 2)
// @desc    Teacher Login
const teacherLogin = async (req, res) => {
    const { employeeCode, password } = req.body;
    try {
        const teacher = await Teacher.findOne({ employeeCode });

        if (!teacher || !teacher.isActive) {
            return res.status(401).json({ 
                message: "Account is inactive or not found. Please contact Admin." 
            });
        }

        if (teacher && (await bcrypt.compare(password, teacher.password))) {
            res.json({
                _id: teacher._id,
                name: teacher.name,
                role: 'teacher',
                employeeCode: teacher.employeeCode,
                email: teacher.email,
                phone: teacher.phone,
                gender: teacher.gender,
                dateOfBirth: teacher.dateOfBirth,
                joiningDate: teacher.joiningDate,
                experience: teacher.experience,
                address: teacher.address,
                aadharNumber: teacher.aadharNumber,
                qualifications: teacher.qualifications,
                profileImage: teacher.profileImage,
                token: generateToken(teacher._id, 'teacher')
            });
        } else {
            res.status(401).json({ message: "Invalid employee code or password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};



// TEMPORARY: Create first admin (Delete this after use)
const createFirstAdmin = async (req, res) => {
    try {
        // 1. Hard-delete any existing admin to avoid "Duplicate Key" errors
        await Admin.deleteMany({}); 

        // 2. Define your credentials
        const email = "admin@test.com";
        const password = "Admin@@2026##";

        // 3. Use .create() - THIS TRIGGERS THE HASHING HOOK
        const admin = await Admin.create({
            name: "School Owner",
            email: email,
            username: "admin",
            password: password,
            role: "admin"
        });

        res.status(201).json({ 
            message: "Admin created and password HASHED successfully", 
            email: admin.email,
            password_status: "Secured" 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


module.exports = { adminLogin, studentLogin, teacherLogin, createFirstAdmin };