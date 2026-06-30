const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '24h', // Token valid for 24 hours
    });
};

module.exports = generateToken;