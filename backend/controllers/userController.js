const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;
        const role = req.user.role;

        let userModel;
        if (role === 'admin') userModel = Admin;
        else if (role === 'teacher') userModel = Teacher;
        else if (role === 'student') userModel = Student;

        const user = await userModel.findById(userId);

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Update password
        user.password = newPassword;
        
        // If it's a student, mark the temporary password as changed
        if (role === 'student') {
            user.isPasswordChanged = true;
        }

        await user.save();
        res.status(200).json({ message: "Password updated successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};



const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [
                { recipient: req.user._id },
                { recipient: null, recipientRole: req.user.role }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(15);

        notifications.forEach((n, idx) => {
            console.log(`   ${idx + 1}. [${n.isRead ? '✓' : '○'}] ${n.title}: "${n.message}" (ID: ${n._id})`);
        });

        res.status(200).json(notifications);
    } catch (error) {
        console.error("💥 ERROR FETCHING NOTIFICATIONS:", error);
        res.status(500).json({ message: "Error fetching notifications", error: error.message });
    }
};


// @desc    Mark all unread notifications as read
// @route   PUT /api/users/notifications/read-all
const markNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { 
                $or: [
                    { recipient: req.user._id }, 
                    { recipientRole: req.user.role }
                ], 
                isRead: false 
            },
            { $set: { isRead: true } }
        );

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        res.status(500).json({ message: "Error updating notifications", error: error.message });
    }
};

const updateProfilePicture = async (req, res) => {
    try {
        const { image } = req.body; // Still receives base64 from frontend
        const userId = req.user._id;
        const role = req.user.role;

        if (!image) {
            return res.status(400).json({ message: "No image data provided" });
        }

        // Step 1: Upload the base64 image to Cloudinary
        // The folder name keeps school images organized in your Cloudinary dashboard
        const uploadResult = await cloudinary.uploader.upload(image, {
            folder: 'dv_convent_school/profiles',
            transformation: [
                { width: 400, height: 400, crop: 'fill', gravity: 'face' },
                { quality: 'auto', fetch_format: 'auto' }
            ],
            // Use userId as public_id so re-uploads overwrite the old image
            public_id: `${role}_${userId}`,
            overwrite: true
        });

        // Step 2: Store only the secure URL (80 chars) not the base64 (100-300KB)
        const imageUrl = uploadResult.secure_url;

        let userModel;
        if (role === 'admin') userModel = Admin;
        else if (role === 'teacher') userModel = Teacher;
        else if (role === 'student') userModel = Student;

        // Step 3: Save the URL to MongoDB (tiny string, not giant base64)
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { profileImage: imageUrl },
            { new: true }
        ).select('-password');

        res.status(200).json({
            message: "Profile picture updated successfully",
            profileImage: updatedUser.profileImage
        });

    } catch (error) {
        console.error("PROFILE_PIC_ERROR:", error);
        res.status(500).json({ message: "Upload failed", error: error.message });
    }
};


const updateUserInfo = async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const userId = req.user._id;
        const role = req.user.role;

        let userModel;
        if (role === 'admin') userModel = Admin;
        else if (role === 'teacher') userModel = Teacher;
        else if (role === 'student') userModel = Student;

        // Use { new: true } to get the document AFTER the update
        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            { $set: { name, email, phone } },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Return the full updated object
        res.status(200).json({
            message: "Information updated successfully",
            user: {
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                username: updatedUser.username,
                profileImage: updatedUser.profileImage,
                // Include any other fields the frontend needs
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




module.exports = { 
    changePassword, 
    getNotifications,       
    markNotificationsRead,
    updateProfilePicture,
    updateUserInfo
};