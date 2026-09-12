const { validationResult, body } = require("express-validator");
const User = require("../models/Users");
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken");
const { ActivityLog } = require("../models");

exports.login = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Invalid email address")
        .normalizeEmail(),

    body("password")
        .notEmpty()
        .withMessage("Password is required")
    , async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array()
            });
        }

        try {
            const { email, password } = req.body;

            const user = await User.findOne({
                where: { email,is_deleted:false }
            });

            if (!user) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const passwordMatch = await bcrypt.compare(
                password,
                user.password
            );

            if (!passwordMatch) {
                return res.status(401).json({
                    message: "Invalid email or password"
                });
            }

            const token = jwt.sign(
                {
                    id: user.id,
                    role: user.role
                },
                process.env.JWT_SECRET
            );

             await ActivityLog.create({
                action: "login",
                entity_type: "user",
                entity_id: user.id,
                entity_name: `${user.name} ${user.last_name}`,
                description: `User ${user.name} ${user.last_name} logged in`,
                user_name: `${user.name} ${user.last_name}`,
                user_role: user.role,
                user_id: user.id
            });

            return res.status(200).json({
                message: "Login successful",
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    last_name: user.last_name,
                    email: user.email,
                    role: user.role
                }
            });
            return res.status(200).json({
                message: "Login successful"
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                message: "Server error"
            });
        }
    }]

exports.getProfile = async (req, res) => {
  try {
    const userId = req.userId;
 
    const user = await User.findOne({
      where: { id: userId, is_deleted: false },
      attributes: ["id", "name", "last_name", "email", "role", "createdAt"],
    });
 
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود." });
    }
 
    const lastLogin = await ActivityLog.findOne({
      where: { user_id: userId, action: "login" },
      order: [["createdAt", "DESC"]],
      attributes: ["createdAt"],
    });
 
    return res.status(200).json({
      user,
      lastLogin: lastLogin?.createdAt || null,
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "خطأ في الخادم." });
  }
};
 
/* ---------------------------------------------------------
   PUT /api/admin/profile
--------------------------------------------------------- */
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
 
  try {
    const userId = req.userId

    const { nom, prenom, telephone, email } = req.body;
 
    const user = await User.findOne({
      where: { id: userId, is_deleted: false },
    });
 
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود." });
    }
 
    // Check email uniqueness if it changed
    if (email && email !== user.email) {
      const existing = await User.findOne({
        where: { email, is_deleted: false },
      });
      if (existing) {
        return res
          .status(409)
          .json({ message: "البريد الإلكتروني مستخدم من قبل حساب آخر." });
      }
    }
 
    user.name = nom ?? user.name;
    user.last_name = prenom ?? user.last_name;
    user.email = email ?? user.email;
    // telephone: add a column to the User model if you need to persist it,
    // it's accepted here but not currently stored since the model has no field for it
    await user.save();
 
    await ActivityLog.create({
      action: "update",
      entity_type: "user",
      entity_id: user.id,
      entity_name: `${user.last_name} ${user.name}`,
      description: "تعديل المعلومات الشخصية",
      user_name: `${user.last_name} ${user.name}`,
      user_role: user.role,
      user_id: user.id,
    });
 
    return res.status(200).json({
      message: "تم تحديث المعلومات الشخصية بنجاح.",
      user: {
        id: user.id,
        name: user.name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: "خطأ في الخادم." });
  }
};
 
/* ---------------------------------------------------------
   PUT /api/admin/password
--------------------------------------------------------- */
exports.updatePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
 
  try {
        const userId = req.userId

    const { ancien, nouveau } = req.body;
 
    const user = await User.findOne({
      where: { id: userId, is_deleted: false },
    });
 
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود." });
    }
 
    const match = await bcrypt.compare(ancien, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ errors: [{ path: "ancien", msg: "كلمة المرور الحالية غير صحيحة." }] });
    }
 
    const hashed = await bcrypt.hash(nouveau, 10);
    user.password = hashed;
    await user.save();
 
    await ActivityLog.create({
      action: "update",
      entity_type: "user",
      entity_id: user.id,
      entity_name: `${user.last_name} ${user.name}`,
      description: "تغيير كلمة المرور",
      user_name: `${user.last_name} ${user.name}`,
      user_role: user.role,
      user_id: user.id,
    });
 
    return res.status(200).json({ message: "تم تحديث كلمة المرور بنجاح." });
  } catch (err) {
    console.error("updatePassword error:", err);
    return res.status(500).json({ message: "خطأ في الخادم." });
  }
};