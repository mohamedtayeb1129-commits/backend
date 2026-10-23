const { validationResult, body } = require("express-validator");
const Supervisor = require("../models/Supervisor");
const User = require("../models/Users");
const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");
const ActivityLog = require("../models/ActivityLog");
const StaffSalary = require("../models/StaffSalary");
const { Op } = require("sequelize");

const getUser = async (req) => {
  const userId = req.userId;
  const user = await User.findByPk(userId);
  return user;
};

exports.createSupervisors = [
  body("name").trim().notEmpty().withMessage("Name is required."),

  body("last_name").trim().notEmpty().withMessage("Last name is required."),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid phone number."),

  body("cin")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid cin."),

  body("salary")
    .notEmpty()
    .withMessage("Salary is required.")
    .isNumeric()
    .withMessage("Salary must be a number.")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Salary cannot be negative.");
      }
      return true;
    }),
  body("status")
    .isIn(["نشط", "في إجازة", "غير نشط"])
    .withMessage("Invalid teacher status."),
  body("role")
    .isIn(["قيم(ة)",
            "كاتب(ة)",
            "مدير(ة)",
            "نائب مدير"])
    .withMessage("Invalid teacher status."),
  body("joined_date")
    .notEmpty()
    .withMessage("Joined date is required")
    .isISO8601()
    .withMessage("Joined date must be a valid date"),

  async (req, res) => {
    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }
      const user = await getUser(req);
      const {
        name,
        last_name,
        cin,
        phone,
        salary,
        status,
        role,
        email,
        password,
        joined_date,
      } = req.body;
      const cinSupervisor = await Supervisor.findOne({ where: { cin } });
      if (cinSupervisor) {
        return res.status(400).json({
          message: "cin exist",
        });
      }

      // email is only used when a User account is created (clerk role)
      if (role === "كاتب(ة)") {
        const emailUser = await User.findOne({ where: { email } });
        if (emailUser) {
          return res.status(400).json({
            message: "email exist",
          });
        }
      }

      const supervisor = await Supervisor.create({
        name,
        last_name,
        cin,
        phone,
        salary,
        status,
        role,
        joined_date,
      });
      if (role === "كاتب(ة)") {
        const passwordHash = await bcrypt.hash(password, 10);
        await User.create({
          name,
          email,
          last_name,
          password: passwordHash,
          role,
          joined_date,
          supervisor_id:supervisor.id
        });
      }
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const joinedDate = new Date(joined_date);

      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

      let workedDays = null;
      if (
        joinedDate.getFullYear() === currentYear &&
        joinedDate.getMonth() + 1 === currentMonth
      ) {
        workedDays = daysInMonth - joinedDate.getDate() + 1;
      }

      const staffSalary = await StaffSalary.create({
        person_type: "supervisor",
        person_id: supervisor.id,
        month: currentMonth,
        year: currentYear,
        base_salary: salary, // full contract salary — shown as-is in "الراتب الأساسي"
        absence_days: 0,
        unjustified_absence_days: 0,
        worked_days: workedDays, // null = full month, no proration
        days_in_month: daysInMonth,
      });

      await ActivityLog.create({
        action: "create",
        entity_type: "supervisor",
        entity_id: supervisor.id,
        entity_name: `${supervisor.name} ${supervisor.last_name}`,
        description: `تمت إضافة المشرف ${supervisor.name} ${supervisor.last_name}`,
        user_name: `${user.name} ${user.last_name}`,
        user_role: user.role,
        user_id: user.id,
      });

      return res.status(201).json({
        message: "Supervisor added successfully.",
        supervisor,
        staffSalary,
      });
    } catch (error) {
      console.error("Create teacher error:", error);

      return res.status(500).json({
        message: "Server error.",
      });
    }
  },
];

exports.getAllSupervisors = async (req, res) => {
  try {
    const supervisors = await Supervisor.findAll({
      where: { is_deleted: false },
      order: [["createdAt", "DESC"]],
      include:[
        {
          model:User,
          as:"userSupervisor",
          attributes:["email"]
        }
      ]
    });

    return res.status(200).json({
      message: "Supervisors retrieved successfully.",
      supervisors,
    });
  } catch (error) {
    console.error("Get Supervisors error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

exports.deleteSupervisor = async (req, res) => {
  try {
    const user = await getUser(req);
    const { id } = req.params;
    const supervisor = await Supervisor.findByPk(id);
    if (!supervisor) {
      return res.status(404).json({
        message: "supervisor not found.",
      });
    }
    supervisor.update({ is_deleted: true });

    await ActivityLog.create({
      action: "delete",
      entity_type: "supervisor",
      entity_id: supervisor.id,
      entity_name: `${supervisor.name} ${supervisor.last_name}`,
      description: `تم حذف المشرف ${supervisor.name} ${supervisor.last_name}`,
      user_name: `${user.name} ${user.last_name}`,
      user_role: user.role,
      user_id: user.id,
    });

    return res.status(200).json({
      message: "supervisor deleted.",
    });
  } catch (error) {
    console.error("Get teacher error:", error);

    return res.status(500).json({
      message: "Server error.",
    });
  }
};

exports.updateSupervisor = [
  body("name").trim().notEmpty().withMessage("Name is required."),

  body("last_name").trim().notEmpty().withMessage("Last name is required."),

  body("cin")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid cin."),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{8}$/)
    .withMessage("Invalid phone number."),

  body("salary")
    .notEmpty()
    .withMessage("Salary is required.")
    .isNumeric()
    .withMessage("Salary must be a number.")
    .custom((value) => {
      if (Number(value) < 0) {
        throw new Error("Salary cannot be negative.");
      }
      return true;
    }),

  body("status")
    .isIn(["نشط", "في إجازة", "غير نشط"])
    .withMessage("Invalid supervisor status."),

  body("role")
    .isIn(["قيم(ة)",
            "كاتب(ة)",
            "مدير(ة)",
            "نائب مدير"])
    .withMessage("Invalid supervisor role."),

  async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        await transaction.rollback();

        return res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const user = await getUser(req);

      const {
        name,
        last_name,
        phone,
        salary,
        date_deposited,
        status,
        role,
        cin,
        email,
        password,
      } = req.body;

      // Find supervisor
     const supervisor = await Supervisor.findByPk(id, {
  include: [{ model: User, as: "userSupervisor" }], // same alias as in your GET
  transaction,
});

      if (!supervisor) {
        await transaction.rollback();

        return res.status(404).json({
          message: "Supervisor not found.",
        });
      }

      // Check duplicate CIN
      if (cin) {
        const existingSupervisor = await Supervisor.findOne({
          where: {
            cin,
            id: {
              [Op.ne]: id,
            },
            is_deleted: false,
          },
          transaction,
        });

        if (existingSupervisor) {
          await transaction.rollback();

          return res.status(400).json({
            message: "CIN already exists.",
          });
        }
      }

      // Update supervisor
      await supervisor.update(
        {
          name,
          last_name,
          phone,
          cin,
          salary,
          date_deposited,
          status,
          role,
        },
        { transaction },
      );

      /*
       * create/update the User account
       */
      if (role === "كاتب(ة)") {
  let supervisorUser = supervisor.userSupervisor;

  if (supervisorUser) {
    // UPDATE existing account — password optional
    const userData = { name, last_name, phone, email };

    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    await supervisorUser.update(userData, { transaction });
  } else {
    // CREATE new account — password required here
    if (!password) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Password is required to create an account.",
      });
    }

    const newUser = await User.create(
      {
        name,
        last_name,
        phone,
        email,
        password: await bcrypt.hash(password, 10),
        role: "كاتب(ة)",
      },
      { transaction },
    );

    await supervisor.update({ user_id: newUser.id }, { transaction });
  }
}
      // Activity Log
      await ActivityLog.create(
        {
          action: "update",
          entity_type: "supervisor",
          entity_id: supervisor.id,
          entity_name: `${supervisor.name} ${supervisor.last_name}`,
          description: `تم تعديل بيانات المشرف ${supervisor.name} ${supervisor.last_name}`,
          user_name: `${user.name} ${user.last_name}`,
          user_role: user.role,
          user_id: user.id,
        },
        { transaction },
      );

      await transaction.commit();

      return res.status(200).json({
        message: "Supervisor updated successfully.",
        supervisor,
      });
    } catch (error) {
      await transaction.rollback();

      console.error("Update supervisor error:", error);

      return res.status(500).json({
        message: "Server error.",
      });
    }
  },
];
