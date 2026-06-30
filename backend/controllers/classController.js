const Class = require('../models/Class');
const Settings = require('../models/Settings');
const Student = require('../models/Student');
 

// @desc    Create a new Class
// @route   POST /api/admin/classes
const createClass = async (req, res) => {
    try {
        const { className, capacity, classTeacher } = req.body;

        // ❌ REMOVE year-based duplicate check
        const classExists = await Class.findOne({ className });
        if (classExists) {
            return res.status(400).json({ 
                message: `Class ${className} already exists in the system.` 
            });
        }

        // Teacher conflict check (if assigning)
        if (classTeacher) {
            const isAlreadyManaged = await Class.findOne({ classTeacher });
            if (isAlreadyManaged) {
                return res.status(400).json({ 
                    message: "This teacher is already a Class Teacher." 
                });
            }
        }

        // ✅ Create class WITHOUT academicYear
        const newClass = await Class.create({
            className,
            capacity,
            classTeacher: classTeacher || null
        });

        res.status(201).json(newClass);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

const getClasses = async (req, res) => {
    try {
        // ✅ NO YEAR FILTER - Return ALL classes
        const classes = await Class.find()
            .populate('classTeacher', 'name employeeCode')
            .sort({ className: 1 });

        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// @desc    Get classes managed by the logged-in teacher (for Attendance)
const getManagedClasses = async (req, res) => {
    try {
        const classes = await Class.find({ classTeacher: req.user._id });
        res.status(200).json(classes);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const getClassRoster = async (req, res) => {
    try {
        const { classId } = req.params;
        const { search } = req.query;

        // Step 1: Resolve classId to class name string
        const targetClass = await Class.findById(classId);
        if (!targetClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        // Step 2: Build lean query — only active students in this class
        let query = {
            class: targetClass.className,
            accountStatus: 'active'
        };

        // Step 3: Optional search filter (name or UID only)
        if (search && search.trim() !== '') {
            query.$or = [
                { name: { $regex: search.trim(), $options: 'i' } },
                { UID: { $regex: search.trim(), $options: 'i' } }
            ];
        }

        // Step 4: THE CRITICAL FIX — select ONLY the 5 fields needed
        // profileImage is intentionally excluded — this is what caused 177s delay
        const students = await Student.find(query)
            .select('_id name UID accountStatus')
            .sort({ name: 1 })
            .lean(); // .lean() returns plain JS objects — faster than Mongoose documents

        res.status(200).json({
            className: targetClass.className,
            count: students.length,
            students
        });

    } catch (error) {
        console.error("ROSTER_ERROR:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};



const updateClass = async (req, res) => {
    try {
        const { className, capacity, classTeacher, academicYear } = req.body;
        
        // --- DEFINE THE MISSING VARIABLE HERE ---
        const classId = req.params.id; 

        // 1. Find the class
        let targetClass = await Class.findById(classId);
        if (!targetClass) return res.status(404).json({ message: "Class not found" });

        // ARCHITECT'S GUARD: Check if the teacher is busy elsewhere
        if (classTeacher) {
            const isAlreadyManaged = await Class.findOne({ 
                classTeacher, 
                // Use the year from the body or fall back to the existing record's year
                academicYear: academicYear || targetClass.academicYear, 
                // Correctly exclude the current class using the variable we just defined
                _id: { $ne: classId } 
            });

            if (isAlreadyManaged) {
                return res.status(400).json({ 
                    message: "Action Denied: This teacher is already heading another class." 
                });
            }
        }

        // 2. Security Check: Prevent duplicate class names if the name is being changed
        if (className && className !== targetClass.className) {
            const exists = await Class.findOne({ 
                className, 
                academicYear: targetClass.academicYear 
            });
            if (exists) return res.status(400).json({ message: "A class with this name already exists for this session." });
        }

        // 3. Clean up the teacher ID (if "Assign Later" is chosen)
        const updateData = { ...req.body };
        if (updateData.classTeacher === "") {
            updateData.classTeacher = null; // Correct way to "Unassign" in MongoDB
        }

        // 4. Perform Update
        const updatedClass = await Class.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).populate('classTeacher', 'name');

        res.status(200).json({ message: "Class updated successfully", updatedClass });

    } catch (error) {
        res.status(500).json({ message: "Update Error", error: error.message });
    }
};

const deleteClass = async (req, res) => {
    try {
        const classId = req.params.id;

        // 1. Check if class exists
        const targetClass = await Class.findById(classId);
        if (!targetClass) {
            return res.status(404).json({ message: "Class not found" });
        }

        // 2. ARCHITECT'S SAFETY CHECK: 
        // Optional: You could check if students are assigned to this class 
        // before allowing deletion. For now, we proceed with direct deletion.
        
        await Class.findByIdAndDelete(classId);

        res.status(200).json({ 
            message: `Class ${targetClass.className} has been deleted successfully.` 
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

module.exports = { createClass, getClasses, getManagedClasses, getClassRoster, updateClass, deleteClass };
