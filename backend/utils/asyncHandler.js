/**
 * asyncHandler — wraps async route handlers to automatically
 * catch errors and forward them to Express's error middleware.
 *
 * Usage:
 *   router.get('/route', asyncHandler(async (req, res) => {
 *     const data = await SomeModel.find();
 *     res.json(data);
 *   }));
 *
 * This eliminates the need for try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;