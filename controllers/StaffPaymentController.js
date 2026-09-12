const { Op } = require("sequelize");
const StaffSalary = require("../models/StaffSalary");
const StaffPayment = require("../models/StaffPayment");
const Employ = require("../models/Employ");
const Supervisor = require("../models/Supervisor");
const { ActivityLog, User } = require("../models");
const getUser = async (req) => {
        const userId = req.userId;
        const user = await User.findByPk(userId);
        return user
}

exports.getStaffSalaries = async (req, res) => {
    try {
        const salaries = await StaffSalary.findAll({
            order: [["year", "DESC"], ["month", "DESC"], ["person_type", "ASC"], ["person_id", "ASC"]]
        });

     

        const result = await Promise.all(
            salaries.map(async (salary) => {
                let person = null;

                if (salary.person_type === "employ") {
                    person = await Employ.findByPk(salary.person_id, {
                        attributes: ["id", "name", "last_name"]
                    });
                }

                if (salary.person_type === "supervisor") {
                    person = await Supervisor.findByPk(salary.person_id, {
                        attributes: ["id", "name", "last_name", "role"]
                    });
                }

                const payment = await StaffPayment.findOne({
                    where: {
                        person_type: salary.person_type,
                        person_id: salary.person_id,
                        month: salary.month,
                        year: salary.year
                    }
                });

                return {
                    salary_id: salary.id,

                    person_type: salary.person_type,
                    person_id: salary.person_id,

                    name: person?.name || "",
                    last_name: person?.last_name || "",
                    role: person?.role || null,

                    month: salary.month,
                    year: salary.year,

                    base_salary: salary.base_salary,
                    absence_days: salary.absence_days,
                    total_salary: salary.total_salary,

                    payment: payment
                        ? {
                            id: payment.id,
                            amount: payment.amount,
                            status: payment.status,
                            paid_at: payment.updatedAt
                        }
                        : {
                            id: null,
                            amount: 0,
                            status: salary.status,
                            paid_at: null
                        }
                };
            })
        );

        return res.status(200).json({
            message: "salaries retrieved successfully.",
            salaries: result
        });

    } catch (error) {
        console.error("Get staff salaries error:", error);

        return res.status(500).json({
            message: "Server error."
        });
    }
};

exports.confirmStaffPayment = async (req, res) => {
    try {
        const user = await getUser(req)
        const { person_type, person_id, month, year } = req.body;

        if (!["employ", "supervisor"].includes(person_type)) {
            return res.status(400).json({
                message: "Invalid person type."
            });
        }

        const salary = await StaffSalary.findOne({
            where: {
                person_type,
                person_id,
                month,
                year
            }
        });

        if (!salary) {
            return res.status(404).json({
                message: "Salary not found."
            });
        }

        // Check if already paid
        const existingPayment = await StaffPayment.findOne({
            where: {
                person_type,
                person_id,
                month,
                year
            }
        });

        if (existingPayment?.status === "payé") {
            return res.status(400).json({
                message: "Salary already paid."
            });
        }

        const person = person_type === "employ"
            ? await Employ.findByPk(person_id, { attributes: ["name", "last_name"] })
            : await Supervisor.findByPk(person_id, { attributes: ["name", "last_name"] });

        if (!person) {
            return res.status(404).json({
                message: "Person not found."
            });
        }

        let payment;

        if (existingPayment) {

            payment = await existingPayment.update({
                amount: salary.total_salary,
                status: "payé"
            });

        } else {

            payment = await StaffPayment.create({
                person_type,
                person_id,
                month,
                year,
                amount: salary.total_salary,
                status: "payé"
            });
        }

        await ActivityLog.create({
            action: "pay",
            entity_type: person_type === "employ" ? "employ" : "supervisor",
            entity_id: person_id,
            entity_name: `${person.name} ${person.last_name}`,
            description: `تم تأكيد دفع راتب شهر ${month}/${year} بمبلغ ${salary.total_salary}`,
            user_name: `${user.name} ${user.last_name}`,
            user_role: user.role,
            user_id: user.id
        });

        return res.status(200).json({
            message: "Payment confirmed successfully.",
            payment
        });

    } catch (error) {
        console.error("Confirm staff payment error:", error);

        return res.status(500).json({
            message: "Server error."
        });
    }
};