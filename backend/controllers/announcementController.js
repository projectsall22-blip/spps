const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const { sendPushToRole } = require('../utils/sendPushNotification');
// @desc    Step 2: Create a New Announcement (Broadcast)
// @route   POST /api/admin/announcements
// @access  Private (Admin Only)
const createAnnouncement = async (req, res) => {
    try {
        const { title, message, targetAudience, priority, expiryDate, attachments, isActive } = req.body;

        const settings = await require('../models/Settings').findOne();
        const activeYear = settings ? settings.currentAcademicYear : "2025-26";

        // 1. Basic Validation
        if (!title || !message || !targetAudience) {
            return res.status(400).json({ message: "Title, Message, and Target Audience are required" });
        }

        // 2. Create Notice with Audit Trail (createdBy)
        const announcement = await Announcement.create({
            title,
            message,
            targetAudience,
            priority: priority || 'Normal',
            expiryDate,
            academicYear: activeYear,
            attachments: attachments || [],
            isActive: isActive !== undefined ? isActive : true, // Allows creating as Draft (isActive: false)
            createdBy: req.user._id // Tracking which admin posted it
        });

        if (targetAudience === 'Everyone') {
            // Create two notifications: one for teachers, one for students
            await Notification.insertMany([
                { recipientRole: 'teacher', title: 'New Notice', message: title, link: '/teacher/announcements' },
                { recipientRole: 'student', title: 'New Notice', message: title, link: '/student/announcements' }
            ]);
            // Push to both roles
            await sendPushToRole('teacher', { title: '≡ƒôó New Notice', body: title, url: '/teacher/announcements' });
            await sendPushToRole('student', { title: '≡ƒôó New Notice', body: title, url: '/student/announcements' });
        } else {
            // Create for specific role (Convert 'Teachers' to 'teacher', etc.)
            const role = targetAudience.toLowerCase().slice(0, -1); 
            await Notification.create({
                recipientRole: role,
                title: 'New Notice',
                message: title,
                link: `/${role}/announcements`
            });
            await sendPushToRole(role, { title: '≡ƒôó New Notice', body: title, url: `/${role}/announcements` });
        }

        res.status(201).json({ 
            message: "Announcement broadcasted successfully", 
            announcement 
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get All Announcements (Admin View - includes Inactive/Drafts)
// @route   GET /api/admin/announcements
const getAdminAnnouncements = async (req, res) => {
    try {
        // 1. Fetch current session context
        const settings = await require('../models/Settings').findOne();
        const activeYear = settings ? settings.currentAcademicYear : "2025-26";

        // 2. Filter by current year ONLY
        const announcements = await Announcement.find({ academicYear: activeYear })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(announcements);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update Announcement (Edit or Toggle Draft)
// @route   PUT /api/admin/announcements/:id
const updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        res.status(200).json({ message: "Announcement updated", announcement });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Delete Announcement
// @route   DELETE /api/admin/announcements/:id
const deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        // PERMANENT DELETE
        await Announcement.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Notice deleted and removed from all feeds." });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};


const getMyAnnouncements = async (req, res) => {
    try {
        const userRole = req.user.role; // 'teacher' or 'student'
        const now = new Date();

        const settings = await require('../models/Settings').findOne();
        const activeYear = settings ? settings.currentAcademicYear : "2025-26";

        // 1. Build the Base Query
        let query = {
            isActive: true,
            academicYear: activeYear,
            // AUTOMATIC EXPIRY FILTER: 
            // Show if expiryDate doesn't exist OR if it's in the future
            $or: [
                { expiryDate: { $exists: false } },
                { expiryDate: null },
                { expiryDate: { $gt: now } }
            ]
        };

        // 2. APPLY ROLE-BASED TARGETING
        if (userRole === 'teacher') {
            query.targetAudience = { $in: ['Teachers', 'Everyone'] };
        } else if (userRole === 'student') {
            query.targetAudience = { $in: ['Students', 'Everyone'] };
        }

        // 3. FETCH & SORT (Priority Logic)
        // We fetch and then apply a custom sort to ensure 'Urgent' is always at the top
        const announcements = await Announcement.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        // ARCHITECT'S PRO TIP: Custom sort for Priority
        const priorityOrder = { 'Urgent': 1, 'Important': 2, 'Normal': 3 };
        announcements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        res.status(200).json(announcements);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get Badge Count for New Announcements
// @route   GET /api/users/announcements/count
const getNewAnnouncementCount = async (req, res) => {
    try {
        const userRole = req.user.role;
        const now = new Date();

        let query = { 
            isActive: true, 
            $or: [
                { expiryDate: { $exists: false } },
                { expiryDate: null },
                { expiryDate: { $gt: now } }
            ]
        };

        if (userRole === 'teacher') query.targetAudience = { $in: ['Teachers', 'Everyone'] };
        else query.targetAudience = { $in: ['Students', 'Everyone'] };

        const count = await Announcement.countDocuments(query);
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};


// @desc    Step 5: Dashboard Summary (Latest 3 Prioritized Notices)
// @route   GET /api/users/announcements/latest
// @access  Private (Teacher/Student)
const getLatestAnnouncements = async (req, res) => {
    try {
        const userRole = req.user.role;
        const now = new Date();

        // 1. Build Secure Query (Reuse the logic from Step 3)
        let query = {
            isActive: true,
            $or: [
                { expiryDate: { $exists: false } },
                { expiryDate: null },
                { expiryDate: { $gt: now } }
            ]
        };

        if (userRole === 'teacher') {
            query.targetAudience = { $in: ['Teachers', 'Everyone'] };
        } else if (userRole === 'student') {
            query.targetAudience = { $in: ['Students', 'Everyone'] };
        }

        // 2. Fetch Latest 10 (We fetch 10 but will return 3 after sorting)
        const announcements = await Announcement.find(query)
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 })
            .limit(10);

        // 3. STEP 4: URGENCY ENGINE (Weighted Sorting)
        // This ensures if there is an 'Urgent' notice, it is in the Top 3 
        // even if it was posted yesterday.
        const priorityWeight = { 'Urgent': 1, 'Important': 2, 'Normal': 3 };
        
        const prioritized = announcements.sort((a, b) => {
            if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
                return priorityWeight[a.priority] - priorityWeight[b.priority];
            }
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        // 4. Return only the Top 3 for the Dashboard Widget
        res.status(200).json(prioritized.slice(0, 3));
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Mark announcements as viewed by current user (called when they open the page)
// @route   POST /api/users/announcements/mark-viewed
// @access  Private (Teacher/Student)
const markAnnouncementsViewed = async (req, res) => {
    try {
        const userId   = req.user._id;
        const userRole = req.user.role;
        const now      = new Date();

        // Build query same as getMyAnnouncements
        let query = { isActive: true, $or: [{ expiryDate: { $exists: false } }, { expiryDate: null }, { expiryDate: { $gt: now } }] };
        if (userRole === 'teacher') query.targetAudience = { $in: ['Teachers', 'Everyone'] };
        else if (userRole === 'student') query.targetAudience = { $in: ['Students', 'Everyone'] };

        // Add this user to viewedBy if not already there
        await Announcement.updateMany(
            { ...query, 'viewedBy.userId': { $ne: userId } },
            { $push: { viewedBy: { userId, role: userRole, viewedAt: now } } }
        );

        res.status(200).json({ message: 'Marked as viewed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get view counts for all announcements (Admin only)
// @route   GET /api/admin/announcements/:id/views
// @access  Private (Admin)
const getAnnouncementViews = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id)
            .select('title viewedBy targetAudience');

        if (!announcement) return res.status(404).json({ message: 'Not found' });

        const totalViews    = announcement.viewedBy.length;
        const teacherViews  = announcement.viewedBy.filter(v => v.role === 'teacher').length;
        const studentViews  = announcement.viewedBy.filter(v => v.role === 'student').length;

        res.status(200).json({ totalViews, teacherViews, studentViews });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// Update your exports at the bottom
module.exports = { 
    createAnnouncement, 
    getAdminAnnouncements, 
    updateAnnouncement, 
    deleteAnnouncement,
    getMyAnnouncements,
    getNewAnnouncementCount,
    getLatestAnnouncements,
    markAnnouncementsViewed,
    getAnnouncementViews
};