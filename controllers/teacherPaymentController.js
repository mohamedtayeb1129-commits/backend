const TeacherPayment = require("../models/TeacherPayment");
const Teacher = require("../models/Teacher");

// GET /teacher-payments
// GET /teacher-payments?month=8&year=2026
async function getTeacherPayments(req, res) {
    try {
        const { month, year, teacher_id, status } = req.query;

        const where = {};
        if (month) where.month = Number(month);
        if (year) where.year = Number(year);
        if (teacher_id) where.teacher_id = Number(teacher_id);
        if (status) where.status = status;

        const payments = await TeacherPayment.findAll({
            where,
            order: [["year", "DESC"], ["month", "DESC"], ["id", "DESC"]]
        });

        const result = await Promise.all(
            payments.map(async (payment) => {
                const teacher = await Teacher.findByPk(payment.teacher_id, {
                    attributes: ["id", "name", "last_name"]
                });

               return {
    payment_id: payment.id,
    teacher_id: payment.teacher_id,
    name: teacher?.name || "",
    last_name: teacher?.last_name || "",
    month: payment.month,
    year: payment.year,
    hour_count: payment.hour_count,
    amount: payment.amount,
    status: payment.status,
    paid_at: payment.updatedAt
};
            })
        );

        return res.status(200).json({
            message: "payments retrieved successfully.",
            payments: result
        });

    } catch (err) {
        console.error("Get teacher payments error:", err);

        return res.status(500).json({
            message: "Server error."
        });
    }
}

// POST /teacher-payments
async function createTeacherPayment(req, res) {
    try {
        const { teacher_id, amount, status } = req.body;

        if (!teacher_id || !amount) {
            return res.status(400).json({ message: "teacher_id et amount sont requis" });
        }

        const payment = await TeacherPayment.create({
            teacher_id,
            amount,
            status: status || "en attente"
        });

        const full = await TeacherPayment.findByPk(payment.id, {
            include: [{ model: Teacher, as: "teacher" }]
        });

        res.status(201).json({ payment: full });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la création du paiement" });
    }
}

// PATCH /teacher-payments/:id/pay
async function confirmTeacherPayment(req, res) {
    try {
        const { id } = req.params;

        const payment = await TeacherPayment.findByPk(id, {
            include: [{ model: Teacher, as: "paymentTeacher" }]
        });

        if (!payment) {
            return res.status(404).json({ message: "Paiement introuvable" });
        }

        if (payment.status !== "no payé") {
            return res.status(400).json({ message: "Ce paiement n'est pas encore payable (statut requis : no payé)." });
        }

        payment.status = "payé";
        await payment.save();

        res.json({ payment });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la confirmation du paiement" });
    }
}

module.exports = { getTeacherPayments, createTeacherPayment, confirmTeacherPayment };