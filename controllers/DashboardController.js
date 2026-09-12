
const { Op, fn, col, literal } = require('sequelize');
const db = require('../models');
const Supervisor = require('../models/Supervisor');
const Employ = require('../models/Employ');
const TuitionFee = require('../models/TuitionFee');
const StaffPayment = require('../models/StaffPayment');
const Purchase = require('../models/Purchase');
const Payment = require('../models/StudentPayment');
const { Student, Teacher } = db;
const {getYearPeriods} = require("../utils/period");



exports.getTotals = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalSupervisors, totalEmployees] = await Promise.all([
      Student.count({
      where:{is_deleted:false},
      }),
      Teacher.count({
      where:{is_deleted:false},

      }),
      Supervisor.count({
      where:{is_deleted:false},

      }),
      Employ.count({
      where:{is_deleted:false},

      }),
    ]);

    return res.status(200).json({
      totalStudents,
      totalTeachers,
      totalSupervisors,
      totalEmployees,
    });
  } catch (error) {
    console.error('getTotals error:', error);
    return res.status(500).json({ message: 'error server' });
  }
}

exports.getGenderDistribution = async (req, res) => {
  try {
    const rows = await Student.findAll({
      attributes: ['gender', [fn('COUNT', col('gender')), 'count']],
      where:{is_deleted:false},
      group: ['gender'],
      raw: true,
    });
    const genderDistribution = rows.map((r) => ({
      gender: r.gender,
      count: Number(r.count),
    }));
    return res.status(200).json({ genderDistribution });
  } catch (error) {
    console.error('getGenderDistribution error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب توزيع التلاميذ حسب الجنس' });
  }
}


exports.getStudentsByLevel = async (req, res) => {
  try {
    const rows = await Student.findAll({
      where:{is_deleted:false},
      attributes: ['class', [fn('COUNT', col('class')), 'count']],
      group: ['class'],
      raw: true,
    });
    const studentsByLevel = rows.map((r) => ({
      level: r.class,
      count: Number(r.count),
    }));
    return res.status(200).json({ studentsByLevel });
  } catch (error) {
    console.error('getStudentsByLevel error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب التلاميذ حسب المستوى' });
  }
}

exports.getPaymentsThisMonth = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const whereThisMonth = {
      createdAt: { [Op.gte]: startOfMonth, [Op.lt]: startOfNextMonth },
    };

    const [totalResult, collectedResult, pendingResult] = await Promise.all([
      Payment.sum('amount', { where: whereThisMonth }),
      Payment.sum('amount', { where: { ...whereThisMonth, status: 'paid' } }),
      Payment.sum('amount', { where: { ...whereThisMonth, status: 'pending' } }),
    ]);

    const paymentsThisMonth = {
      total: totalResult || 0,
      collected: collectedResult || 0,
      pending: pendingResult || 0,
    };

    return res.status(200).json({ paymentsThisMonth });
  } catch (error) {
    console.error('getPaymentsThisMonth error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب مدفوعات هذا الشهر' });
  }
}



exports.getTuitionFees = async (req, res) => {
  try {
    const fees = await TuitionFee.findAll({
      attributes: ['id', 'label', 'type', 'amount'],
      order: [['id', 'ASC']],
      raw: true,
    });

    const tuitionFees = fees.reduce(
      (acc, fee) => {
        if (fee.type === 'monthly') {
          acc.monthly.push(fee);
        } else if (fee.type === 'yearly') {
          acc.yearly.push(fee);
        }

        return acc;
      },
      {
        monthly: [],
        yearly: [],
      }
    );

    return res.status(200).json({ tuitionFees });

  } catch (error) {
    console.error('getTuitionFees error:', error);

    return res.status(500).json({
      message: 'حدث خطأ أثناء جلب تعريفة الدراسة',
    });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const [totalStudents, totalTeachers, totalSupervisors, totalEmployees] = await Promise.all([
      Student.count(),
      Teacher.count(),
      Supervisor.count(),
      Employ.count(),
    ]);

    return res.status(200).json({
      dashboardStats: { totalStudents, totalTeachers, totalSupervisors, totalEmployees },
    });
  } catch (error) {
    console.error('getDashboardSummary error:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات لوحة التحكم' });
  }
}


function getPeriodRange(month, year) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end = new Date(year, month, 1, 0, 0, 0, 0);
    return { start, end };
}

exports.getFinancialSummary = async(req, res) => {
    try {
        const month = parseInt(req.query.month, 10);
        const year = parseInt(req.query.year, 10);

        if (!month || !year || month < 1 || month > 12) {
            return res.status(400).json({ message: "month و year مطلوبين (month بين 1 و 12)" });
        }

        const { start, end } = getPeriodRange(month, year);
        const dateFilter = { createdAt: { [Op.gte]: start, [Op.lt]: end } };

        // الأرباح (الإيرادات من الاشتراكات المدفوعة)
        const revenueResult = await db.Subscription.findOne({
            attributes: [[fn("SUM", col("amount")), "total"]],
            where: {
                ...dateFilter,
                status: "payé"
            },
            raw: true
        });

        // المصاريف: رواتب الموظفين + رواتب الأساتذة + المشتريات
        const staffExpenseResult = await StaffPayment.findOne({
            attributes: [[fn("SUM", col("amount")), "total"]],
            where: { ...dateFilter, status: "payé" },
            raw: true
        });

        const teacherExpenseResult = await db.TeacherPayment.findOne({
            attributes: [[fn("SUM", col("amount")), "total"]],
            where: { ...dateFilter, status: "payé" },
            raw: true
        });

        const purchaseExpenseResult = await Purchase.findOne({
            attributes: [[fn("SUM", col("total_price")), "total"]],
            where: { ...dateFilter },
            raw: true
        });

        const revenue = parseFloat(revenueResult.total) || 0;
        const staffExpense = parseFloat(staffExpenseResult.total) || 0;
        const teacherExpense = parseFloat(teacherExpenseResult.total) || 0;
        const purchaseExpense = parseFloat(purchaseExpenseResult.total) || 0;

        const totalExpenses = staffExpense + teacherExpense + purchaseExpense;
        const netProfit = revenue - totalExpenses;

        return res.json({
            period: {
                from: start.toISOString().split("T")[0],
                to: end.toISOString().split("T")[0]
            },
            revenue,
            expenses: {
                staff: staffExpense,
                teachers: teacherExpense,
                purchases: purchaseExpense,
                total: totalExpenses
            },
            netProfit
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "خطأ في حساب المصاريف والأرباح", error: error.message });
    }
}


function getCurrentPeriod() {
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();

    let { start, end } = getPeriodRange(month, year);
    if (now >= end) {
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
        ({ start, end } = getPeriodRange(month, year));
    }
    return { start, end };
}

exports.getPaymentsSummary = async (req, res) => {
    try {
        const { start, end } = getCurrentPeriod();
        const dateFilter = { date: { [Op.gte]: start, [Op.lt]: end } };

        const [collectedResult, pendingSubscriptions] = await Promise.all([
            db.StudentPayment.sum("amount", { where: dateFilter }),
            db.Subscription.findAll({
                where: { status: { [Op.in]: ["en attente", "non payé"] } },
                include: [
                    {
                        model: db.StudentPayment,
                        as: "studentPayment",
                        required: false,
                        where: dateFilter,
                    },
                ],
            }),
        ]);

        const collected = collectedResult || 0;

        const pending = pendingSubscriptions.reduce((sum, sub) => {
            const paidThisPeriod = (sub.payments || []).reduce(
                (s, p) => s + (parseFloat(p.amount) || 0),
                0
            );
            const remaining = (parseFloat(sub.amount) || 0) - paidThisPeriod;
            return sum + Math.max(remaining, 0);
        }, 0);

        const total = collected + pending;

        return res.status(200).json({
            paymentsThisMonth: { total, collected, pending },
        });
    } catch (error) {
        console.error("getPaymentsSummary error:", error);
        return res
            .status(500)
            .json({ message: "خطأ أثناء جلب ملخص المدفوعات" });
    }
};
 

exports.getMonthlyPayments = async (req, res) => {
    try {
        const year = parseInt(req.query.year, 10) || new Date().getFullYear();
        const periods = getYearPeriods(year);

        const overallStart = periods[0].start;
        const overallEnd = periods[periods.length - 1].end;

        const rows = await db.Subscription.findAll({
            attributes: ["amount", "createdAt"],
            where: {
                status: "payé",
                createdAt: { [Op.gte]: overallStart, [Op.lt]: overallEnd },
            },
            raw: true,
        });

        const totalsByLabel = new Map(periods.map((p) => [p.label, 0]));

        for (const row of rows) {
            const createdAt = new Date(row.createdAt);
            const period = periods.find((p) => createdAt >= p.start && createdAt < p.end);
            if (period) {
                totalsByLabel.set(period.label, totalsByLabel.get(period.label) + (parseFloat(row.amount) || 0));
            }
        }

        const monthlyPayments = periods.map((p) => ({
            month: p.label,
            total: totalsByLabel.get(p.label),
        }));

        return res.status(200).json({ monthlyPayments });
    } catch (error) {
        console.error("getMonthlyPayments error:", error);
        return res.status(500).json({ message: "حدث خطأ أثناء جلب المدفوعات الشهرية" });
    }
};

