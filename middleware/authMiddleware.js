// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authenticateAdmin = (req, res, next) => {
  // گرفتن توکن از هدر Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'دسترسی غیرمجاز. توکن یافت نشد.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res
        .status(403)
        .json({ message: 'توکن نامعتبر یا منقضی شده است.' });
    }
    // اطلاعات کاربر دیکد شده را به درخواست اضافه می‌کنیم
    req.admin = decodedUser;
    next();
  });
};

module.exports = authenticateAdmin;
