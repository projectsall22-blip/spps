const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const teacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    employeeCode: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'teacher' },
    isActive: { type: Boolean, default: true },
    profileImage: { type: String, default: "" },

    // --- NEW & UPDATED FIELDS ---
    email: { type: String, unique: true, sparse: true, lowercase: true }, // Not mandatory (sparse allows nulls while maintaining unique check)
    
    phone: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v) { return /^\d{10}$/.test(v); },
            message: "Teacher phone must be exactly 10 digits."
        }
    },

    gender: { 
        type: String, 
        required: [true, "Gender is mandatory"], 
        enum: ['Male', 'Female', 'Other'] 
    },

    dateOfBirth: { 
        type: Date, 
        required: [true, "Date of Birth is mandatory"] 
    },

    joiningDate: { 
        type: Date, 
        required: [true, "Joining Date is mandatory"] 
    },

    experience: { 
        type: String, 
        required: [true, "Experience is mandatory"] 
    },

    address: { 
        type: String, 
        required: [true, "Address is mandatory"] 
    },

    aadharNumber: { 
        type: String, 
        required: [true, "Aadhar Number is mandatory"],
        unique: true 
    },

    qualifications: { 
        type: String, 
        required: [true, "Qualifications are mandatory"] 
    }

}, { timestamps: true });

teacherSchema.pre('save', async function() {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});


module.exports = mongoose.model('Teacher', teacherSchema);