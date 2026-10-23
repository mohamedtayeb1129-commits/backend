const { ActivityLog, StudentPayment, User } = require("../models");
const Student = require("../models/Student");
const Subscription = require("../models/Subscription");
const { Op, fn, col, where: sqlWhere } = require('sequelize');

const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}

COLLECTED_STATUSES = ["payé","non payé"]
const getCurrentMonth = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const buildMonthFilter = (year, month) => {
  const validYear = /^\d{4}$/.test(year) ? year : null;
  const m = String(month || '').padStart(2, '0');
  const validMonth = /^(0[1-9]|1[0-2])$/.test(m) ? m : null;

  if (validYear && validMonth) return `${validYear}-${validMonth}`;       // exact month
  if (validYear) return { [Op.like]: `${validYear}-%` };                  // whole year
  if (validMonth) return { [Op.like]: `____-${validMonth}` };             // same month, any year
  return null;
};

exports.getAllSubscription = async (req, res) => {
  try {
    const { search = '', level = '', status = '', year = '', month = '' } = req.query;

    const subscriptionWhere = {};
    if (status) subscriptionWhere.status = status;

    const monthFilter = buildMonthFilter(year, month);
    if (monthFilter) subscriptionWhere.month = monthFilter;

    const studentWhere = {};
    if (level) studentWhere.class = level;

    const term = search.trim();
    if (term) {
      studentWhere[Op.and] = [
        sqlWhere(
          fn('CONCAT', col('student.name'), ' ', col('student.last_name')),
          { [Op.like]: `%${term}%` }
        ),
      ];
    }

    const subscriptions = await Subscription.findAll({
      where: subscriptionWhere,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'name', 'last_name', 'class', 'unique_id'],
          where: Object.keys(studentWhere).length || studentWhere[Op.and] ? studentWhere : undefined,
          required: true,
        },
        {
          model: StudentPayment,
          as: 'studentPayment',
          attributes: ['id', 'amount', 'date'],
          required: false,
        },
      ],
      order: [['month', 'DESC'], ['id', 'DESC']],
    });

    // Summary computed on the filtered set
    const totalPaidFiltered = subscriptions
      .filter((s) => COLLECTED_STATUSES.includes(s.status))
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const unpaidCount = subscriptions.filter((s) => s.status === 'non payé').length;

    // Collected in the current month, independent of filters
    const currentMonth = getCurrentMonth();
    const totalCollectedCurrentMonth =
      (await Subscription.sum('amount', {
        where: { month: currentMonth, status: { [Op.in]: COLLECTED_STATUSES } },
      })) || 0;

    // Years available for the year filter
    const monthRows = await Subscription.findAll({
      attributes: ['month'],
      group: ['month'],
      raw: true,
    });
    const years = [...new Set(monthRows.map((r) => String(r.month).slice(0, 4)))]
      .filter((y) => /^\d{4}$/.test(y))
      .sort()
      .reverse();

    return res.json({
      message: 'subscriptions retrieved successfully.',
      subscriptions,
      summary: {
        totalPaidFiltered,
        unpaidCount,
        totalCollectedCurrentMonth,
        currentMonth,
        count: subscriptions.length,
      },
      years,
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return res.status(500).json({ message: 'Server error.' });
  }
};

exports.paySubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body || {};

        const user = await getUser(req);

        const subscription = await Subscription.findByPk(id, {
            include: [
                {
                    model: Student,
                    as: "student",
                    attributes: ["id", "name", "last_name"],
                },
            ],
        });

        if (!subscription) {
            return res.status(404).json({
                message: "subscription not found.",
            });
        }

        // Already fully paid
        if (subscription.status === "payé") {
            return res.status(400).json({
                message: "subscription already paid.",
            });
        }

        const round = (n) => Math.round(n * 1000) / 1000;

        const total = parseFloat(subscription.amount) || 0;

        const paidSoFar = round(
            (await StudentPayment.sum("amount", {
                where: { subscription_id: subscription.id },
            })) || 0
        );

        const remaining = round(Math.max(total - paidSoFar, 0));

        if (remaining <= 0) {
            return res.status(400).json({
                message: "nothing left to pay.",
            });
        }

        // No amount => pay everything that is left
        let payNow = remaining;

        if (amount !== undefined && amount !== null && amount !== "") {
            const parsed = parseFloat(amount);

            if (Number.isNaN(parsed) || parsed <= 0) {
                return res.status(400).json({
                    message: "Invalid amount.",
                });
            }

            if (parsed > remaining + 0.001) {
                return res.status(400).json({
                    message: "Amount cannot exceed the remaining balance.",
                });
            }

            // Partial payment only for quarterly / yearly
            const isUpfront =
                subscription.payment_type === "يدفع بالثلاثي" ||
                subscription.payment_type === "يدفع سنويًا";

            if (!isUpfront && parsed < remaining - 0.001) {
                return res.status(400).json({
                    message: "Partial payment is not allowed for this payment type.",
                });
            }

            payNow = round(parsed);
        }

        const newPaid = round(paidSoFar + payNow);
        const newStatus = newPaid >= total - 0.001 ? "payé" : "partially_paid";

        await Subscription.sequelize.transaction(async (t) => {
            await StudentPayment.create(
                {
                    amount: payNow,
                    date: new Date(),
                    subscription_id: subscription.id,
                },
                { transaction: t }
            );

            await subscription.update({ status: newStatus }, { transaction: t });
        });

        const studentName = subscription.student
            ? `${subscription.student.name} ${subscription.student.last_name}`
            : `Subscription #${subscription.id}`;

        await ActivityLog.create({
            action: "pay",
            entity_type: "subscription",
            entity_id: subscription.id,
            entity_name: studentName,
            description:
                newStatus === "payé"
                    ? `تم دفع اشتراك التلميذ ${studentName} بمبلغ ${payNow}`
                    : `تم دفع جزء من اشتراك التلميذ ${studentName} بمبلغ ${payNow} (المتبقي ${round(total - newPaid)})`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id,
        });

        return res.json({
            message:
                newStatus === "payé"
                    ? "subscription payed with success."
                    : "partial payment recorded.",
            status: newStatus,
            paid: newPaid,
            remaining: round(total - newPaid),
        });

    } catch (error) {
        console.error("Pay subscription error:", error);

        return res.status(500).json({
            message: "Server error.",
        });
    }
};