const BusRoute = require('../models/BusRoute');
const Student  = require('../models/Student');

// GET all routes
const getRoutes = async (req, res) => {
    const routes = await BusRoute.find().sort({ routeName: 1 });
    // attach student count to each route
    const counts = await Student.aggregate([
        { $match: { busRoute: { $ne: null }, accountStatus: 'active' } },
        { $group: { _id: '$busRoute', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[String(c._id)] = c.count; });
    const result = routes.map(r => ({ ...r.toObject(), studentCount: countMap[String(r._id)] || 0 }));
    res.json(result);
};

// POST create route
const createRoute = async (req, res) => {
    const { routeName, description, monthlyFee, stops } = req.body;
    if (!routeName || monthlyFee === undefined)
        return res.status(400).json({ message: 'routeName and monthlyFee are required' });
    const route = await BusRoute.create({ routeName, description, monthlyFee, stops: stops || [] });
    res.status(201).json(route);
};

// PUT update route
const updateRoute = async (req, res) => {
    const route = await BusRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    const { routeName, description, monthlyFee, stops, isActive } = req.body;
    if (routeName   !== undefined) route.routeName   = routeName;
    if (description !== undefined) route.description = description;
    if (monthlyFee  !== undefined) route.monthlyFee  = monthlyFee;
    if (stops       !== undefined) route.stops       = stops;
    if (isActive    !== undefined) route.isActive    = isActive;
    await route.save();
    res.json(route);
};

// DELETE route
const deleteRoute = async (req, res) => {
    // unassign students first
    await Student.updateMany({ busRoute: req.params.id }, { $set: { busRoute: null } });
    await BusRoute.findByIdAndDelete(req.params.id);
    res.json({ message: 'Route deleted and students unassigned' });
};

// GET students on a route
const getRouteStudents = async (req, res) => {
    const students = await Student.find({ busRoute: req.params.id, accountStatus: 'active' })
        .select('name class admissionNo UID fatherName guardianMobile')
        .sort({ class: 1, name: 1 });
    res.json(students);
};

// POST assign student to route
const assignStudent = async (req, res) => {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });
    const route = await BusRoute.findById(req.params.id);
    if (!route) return res.status(404).json({ message: 'Route not found' });
    const student = await Student.findByIdAndUpdate(
        studentId,
        { $set: { busRoute: req.params.id } },
        { new: true }
    ).select('name class admissionNo UID');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student assigned', student });
};

// DELETE remove student from route
const removeStudent = async (req, res) => {
    await Student.findByIdAndUpdate(req.params.studentId, { $set: { busRoute: null } });
    res.json({ message: 'Student removed from route' });
};

// GET all students with their bus route info (for fee integration)
const getStudentBusRoute = async (req, res) => {
    const student = await Student.findById(req.params.studentId).populate('busRoute', 'routeName monthlyFee');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ busRoute: student.busRoute || null });
};

module.exports = { getRoutes, createRoute, updateRoute, deleteRoute, getRouteStudents, assignStudent, removeStudent, getStudentBusRoute };