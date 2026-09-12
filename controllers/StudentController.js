const { validationResult, body, query } = require("express-validator");
const Student = require("../models/Student");
const { Subscription, StudentPayment } = require("../models");
const Price = require("../models/TuitionFee");
const Zone = require("../models/Zone");
const { Op } = require("sequelize");
const DaycareBooksFee = require("../models/DaycareBooksFee");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/Users");
const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}

exports.createStudent = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required."),

    body("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required."),

    body("father_name")
        .optional()
        .trim(),

    body("mother_name")
        .optional()
        .trim(),

    body("father_phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid father phone number."),

    body("mother_phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid mother phone number."),

    body("gender")
        .isIn(["بنت", "ولد"])
        .withMessage("Gender must be M or F."),

    body("birthday")
        .notEmpty()
        .withMessage("Date of birth is required.")
        .isISO8601()
        .withMessage("Invalid date of birth."),

    body("classe")
        .trim()
        .notEmpty()
        .withMessage("Class is required."),

    body("address")
        .trim()
        .notEmpty()
        .withMessage("Address is required."),

    // النسبة/المجانية المطبقة على آخر تلميذ في عرض الإخوة (3 -> 50%, 4 -> مجاني)
    body("promotion")
        .optional({ checkFalsy: true })
        .isIn(["discount_50", "free"])
        .withMessage("Invalid promotion type."),

    async (req, res) => {
        try {
        const user = await getUser(req);

            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                name,
                last_name,
                father_name,
                mother_name,
                father_phone,
                mother_phone,
                address,
                classe,
                gender,
                birthday,
                unique_id,
                transport,
                is_take_book,
                is_take_uniform,
                payment_type,
                zone_id,
                promotion,
                siblings_count,
            } = req.body;

            if (unique_id != null && unique_id !== "") {
                const studentUnique = await Student.findOne({ where: { unique_id } });
                if (studentUnique) {
                    return res.status(400).json({
                        message: "unique id exist",
                    });
                }
            }
            const daycareBooksFee = await DaycareBooksFee.findOne({ where: { label: classe } });
            if (!daycareBooksFee) {
                return res.status(400).json({
                    message: "that class not exist.",
                });
            }
            const toBool = (v) => v === true || v === "true";


            const bookFee = (toBool(is_take_book) && !daycareBooksFee.books_disabled)
                ? parseFloat(daycareBooksFee.books)
                : 0;

            const addition =
                bookFee +
                (toBool(transport) ? 10 : 0) +
                (toBool(is_take_uniform) ? 10 : 0);

            let totalPrice = null;

            if (
                payment_type === "يدفع شهريًا" ||
                payment_type === "يدفع بالثلاثي" ||
                payment_type === "يدفع سنويًا"
            ) {
                const priceType = payment_type === "يدفع سنويًا" ? "yearly" : "monthly";

                const price = await Price.findOne({ where: { label: classe, type: priceType } });
                if (!price) {
                    return res.status(400).json({
                        message: "that class not exist.",
                    });
                }

                let zoneAmount = 0;
                if (zone_id) {
                    const zone = await Zone.findOne({ where: { id: zone_id } });
                    if (!zone) {
                        return res.status(400).json({
                            message: "that zone not exist.",
                        });
                    }
                    zoneAmount = parseFloat(priceType === "monthly" ? zone.amount : zone.amount_yearly);
                }

                const baseAmount = parseFloat(price.amount) + zoneAmount;

                if (priceType === "yearly") {
                    totalPrice = baseAmount + addition;
                } else {
                    const monthlyAmount = baseAmount / 2;
                    totalPrice = payment_type === "يدفع بالثلاثي"
                        ? (monthlyAmount * 3) + addition
                        : monthlyAmount + addition;
                }

                // تطبيق عرض الإخوة: الطفل الثالث 50%، الطفل الرابع مجاني بالكامل
                if (promotion === "discount_50") {
                    totalPrice = totalPrice / 2;
                } else if (promotion === "free") {
                    totalPrice = 0;
                }

            } else if (payment_type !== "غير معني بالدفع") {
                return res.status(400).json({
                    message: "Invalid payment type.",
                });
            }

            const student = await Student.create({
                name,
                last_name,
                father_name,
                mother_name,
                father_phone,
                mother_phone,
                gender,
                birthday,
                unique_id,
                class: classe,
                address,
            });

            if (payment_type !== "غير معني بالدفع") {
               const subscription =  await Subscription.create({
                    amount: totalPrice,
                    student_id: student.id,
                    transport,
                    is_take_book,
                    is_take_uniform,
                    zone_id: zone_id || null,
                    payment_type,
                    promotion: promotion || null,
                    siblings_count: siblings_count || null,
                });

                 await StudentPayment.create({
            amount: totalPrice,
            date: new Date(),
            subscription_id: subscription.id,
                });
            }
            

            await ActivityLog.create({
                action: "create",
                entity_type: "student",
                entity_id: student.id,
                entity_name: `${student.name} ${student.last_name}`,
                description: `تمت إضافة التلميذ ${student.name} ${student.last_name}`,
                user_name: `${user.name} ${user.last_name}`,
                user_role: user.role,
                user_id: user.id,
               
            });

            return res.status(201).json({
                message: "Student added successfully.",
                student,
            });

        } catch (error) {
            console.error("Create student error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    }
];

exports.getAllStudents = async (req, res) => {
    try {
        const students = await Student.findAll({
            order: [["createdAt", "DESC"]],
            where: {
                is_deleted: false
            },
            include: [{
                model: Subscription,
                as: "subscription",
                attributes: [
                    "transport",
                    "is_take_uniform",
                    "is_take_book",
                    "payment_type",
                    "payment_type",
                    "promotion",
                    "siblings_count"
                ],
                include: [{
                    model: Zone,
                    as: "zone",
                    attributes: ["label"]
                }]
            }]
        });

        return res.status(200).json({
            message: "Students retrieved successfully.",
            students,
        });

    } catch (error) {
        console.error("Get students error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};

exports.deleteStudents = async (req, res) => {
    try {
        const user = await getUser(req);
        const { id } = req.params;
        const student = await Student.findByPk(id);
        if (!student) {
            return res.status(404).json({
                message: "Student not found.",
            });
        }
        student.update({ is_deleted: true })

        await ActivityLog.create({
    action: "delete",
    entity_type: "student",
    entity_id: student.id,
    entity_name: `${student.name} ${student.last_name}`,
    description: `تم حذف التلميذ ${student.name} ${student.last_name}`,
    user_name: `${user.name} ${user.last_name}`,
    user_role: user.role,
    user_id: user.id,
});

        return res.status(200).json({
            message: "Student deleted.",
        });

    } catch (error) {
        console.error("Get students error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};

exports.updateStudent = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required."),

    body("last_name")
        .trim()
        .notEmpty()
        .withMessage("Last name is required."),

    body("father_name")
        .optional()
        .trim(),

    body("mother_name")
        .optional()
        .trim(),

    body("father_phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid father phone number."),

    body("mother_phone")
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^\d{8}$/)
        .withMessage("Invalid mother phone number."),

    body("gender")
        .isIn(["بنت", "ولد"])
        .withMessage("Gender must be M or F."),

    body("birthday")
        .notEmpty()
        .withMessage("Date of birth is required.")
        .isISO8601()
        .withMessage("Invalid date of birth."),

    body("classe")
        .trim()
        .notEmpty()
        .withMessage("Class is required."),

    body("address")
        .trim()
        .notEmpty()
        .withMessage("Address is required."),

    async (req, res) => {
        try {
        const user = await getUser(req);

            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const {
                name,
                last_name,
                father_name,
                mother_name,
                father_phone,
                mother_phone,
                address,
                classe,
                gender,
                birthday,
                unique_id,
                transport,
                is_take_book,
                is_take_uniform,
                zone_id
            } = req.body;

            const { id } = req.params;

            // Find student
            const student = await Student.findByPk(id);

            if (!student) {
                return res.status(404).json({
                    message: "Student not found.",
                });
            }

            if (unique_id) {
                const studentUnique = await Student.findOne({
                    where: {
                        unique_id,
                        id: { [Op.ne]: id }
                    }
                });

                if (studentUnique) {
                    return res.status(400).json({
                        message: "Unique ID already exists.",
                    });
                }
            }

            // Check class price
            const price = await Price.findOne({
                where: {
                    label: classe
                }
            });

            if (!price) {
                return res.status(400).json({
                    message: "That class does not exist.",
                });
            }

            // Convert values to boolean
            const toBool = (v) =>
                v === true || v === "true";

            const transportBool = toBool(transport);
            const bookBool = toBool(is_take_book);
            const uniformBool = toBool(is_take_uniform);

            const totalPrice =
                (
                    parseFloat(price.amount) +
                    (bookBool ? 10 : 0) +
                    (transportBool ? 10 : 0) +
                    (uniformBool ? 10 : 0)
                ) / 2;

            await student.update({
                name,
                last_name,
                father_name,
                mother_name,
                father_phone,
                mother_phone,
                gender,
                birthday,
                unique_id,
                class: classe,
                address,
            });

            // Find existing subscription
            const subscription = await Subscription.findOne({
                where: {
                    student_id: student.id
                }
            });

            if (subscription) {
                // Update existing 
                await subscription.update({
                    amount: totalPrice,
                    transport: transportBool,
                    is_take_book: bookBool,
                    is_take_uniform: uniformBool,
                    zone_id: zone_id || null
                });
            } else {
                // Create if student doesn't have one
                await Subscription.create({
                    amount: totalPrice,
                    student_id: student.id,
                    transport: transportBool,
                    is_take_book: bookBool,
                    is_take_uniform: uniformBool,
                    zone_id: zone_id || null
                });
            }

            await ActivityLog.create({
                action: "update",
                entity_type: "student",
                entity_id: student.id,
                entity_name: `${student.name} ${student.last_name}`,
                description: `تم تعديل بيانات التلميذ ${student.name} ${student.last_name}`,
                user_name: `${user.name} ${user.last_name}`,
                user_role: user.role,
                user_id: user.id,
               
            });

            return res.status(200).json({
                message: "Student updated successfully.",
                student,
            });

        } catch (error) {
            console.error("Update student error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    }
];

exports.reenrollStudent  = [
    body("type")
        .trim()
        .notEmpty()
        .withMessage("type is required."),

    async (req, res) => {
        try {
            const user = await getUser(req);

            const levels = [
    "التحضيري",
    "السنة الأولى",
    "السنة الثانية",
    "السنة الثالثة",
    "السنة الرابعة",
    "السنة الخامسة",
    "السنة السادسة",
];

            const errors = validationResult(req);

            if (!errors.isEmpty()) {
                return res.status(400).json({
                    message: "Validation failed",
                    errors: errors.array(),
                });
            }

            const { type } = req.body;
            const { id } = req.params;

            const student = await Student.findByPk(id);

            if (!student) {
                return res.status(404).json({
                    message: "Student not found.",
                });
            }


            // If successful, promote student to next class
            if (type === "ناجح") {
                const currentIndex = levels.indexOf(student.class);

                if (currentIndex === -1) {
                    return res.status(400).json({
                        message: `Invalid student class: ${student.class}`,
                    });
                }
                if (currentIndex < levels.length - 1) {
                    student.class = levels[currentIndex + 1];
                }
            }

            // Save changes
            await student.save();

            await ActivityLog.create({
                action: "update",
                entity_type: "student",
                entity_id: student.id,
                entity_name: `${student.name} ${student.last_name}`,
                description: `تم تسجيل نتيجة التلميذ ${student.name} ${student.last_name} كـ ${type}`,
                user_name: `${user.name} ${user.last_name}`,
                user_role: user.role,
                user_id: user.id,
            });

            return res.status(200).json({
                message: "Student registration result saved successfully.",
                student,
            });

        } catch (error) {
            console.error("Register student error:", error);

            return res.status(500).json({
                message: "Server error.",
            });
        }
    },
];

const toBool = (v) => v === true || v === "true";

async function calculatePrice({
  classe,
  payment_type,
  transport,
  is_take_book,
  is_take_uniform,
  zone_id,
  promotion,
}) {
  const daycareBooksFee = await DaycareBooksFee.findOne({ where: { label: classe } });
  if (!daycareBooksFee) {
    throw { status: 400, message: "that class not exist." };
  }

  const bookFee = (toBool(is_take_book) && !daycareBooksFee.books_disabled)
    ? parseFloat(daycareBooksFee.books)
    : 0;

  const addition =
    bookFee +
    (toBool(transport) ? 10 : 0) +
    (toBool(is_take_uniform) ? 10 : 0);

  if (payment_type === "غير معني بالدفع") {
    return {
      creationMonthPrice: null,
      normalMonthPrice: null,
      breakdown: { addition, base: 0, zoneAmount: 0 },
    };
  }

  if (!["يدفع شهريًا", "يدفع بالثلاثي", "يدفع سنويًا"].includes(payment_type)) {
    throw { status: 400, message: "Invalid payment type." };
  }

  const priceType = payment_type === "يدفع سنويًا" ? "yearly" : "monthly";

  const price = await Price.findOne({ where: { label: classe, type: priceType } });
  if (!price) {
    throw { status: 400, message: "that class not exist." };
  }

  let zoneAmount = 0;
  if (zone_id) {
    const zone = await Zone.findOne({ where: { id: zone_id } });
    if (!zone) {
      throw { status: 400, message: "that zone not exist." };
    }
    zoneAmount = parseFloat(priceType === "monthly" ? zone.amount : zone.amount_yearly);
  }

  const baseAmount = parseFloat(price.amount) + zoneAmount;

  let creationMonthPrice;
  let normalMonthPrice;

  if (priceType === "yearly") {
    // Yearly: no halving, same value both ways.
    creationMonthPrice = baseAmount + addition;
    normalMonthPrice = creationMonthPrice;
  } else {
    const monthlyAmount = baseAmount; // stored price row IS the monthly value — no halving here

    if (payment_type === "يدفع بالثلاثي") {
      // Quarterly: full quarter + one-time addition on creation
      const fullQuarterly = monthlyAmount * 3;
      creationMonthPrice = fullQuarterly + addition;
      normalMonthPrice = fullQuarterly;
    } else {
      // Monthly ONLY: creation month is halved
      creationMonthPrice = (monthlyAmount / 2) + addition;
      normalMonthPrice = monthlyAmount;
    }
  }

  if (promotion === "discount_50") {
    creationMonthPrice = creationMonthPrice / 2;
    normalMonthPrice = normalMonthPrice / 2;
  } else if (promotion === "free") {
    creationMonthPrice = 0;
    normalMonthPrice = 0;
  }

  return {
    creationMonthPrice,
    normalMonthPrice,
    breakdown: { addition, base: baseAmount, zoneAmount },
  };
}

exports.previewPrice = [
  query("classe").trim().notEmpty().withMessage("Class is required."),
  query("payment_type").trim().notEmpty().withMessage("Payment type is required."),
  query("promotion")
    .optional({ checkFalsy: true })
    .isIn(["discount_50", "free"])
    .withMessage("Invalid promotion type."),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: "Validation failed", errors: errors.array() });
    }

    const { classe, payment_type, transport, is_take_book, is_take_uniform, zone_id, promotion } = req.query;

    try {
      const { creationMonthPrice, normalMonthPrice, breakdown } = await calculatePrice({
        classe,
        payment_type,
        transport,
        is_take_book,
        is_take_uniform,
        zone_id,
        promotion,
      });

      return res.status(200).json({ creationMonthPrice, normalMonthPrice, breakdown });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }
      console.error("Preview price error:", err);
      return res.status(500).json({ message: "Server error." });
    }
  },
];