const Employ = require("../models/Employ");
const Supervisor = require("../models/Supervisor");

const MODEL_BY_TYPE = {
    "employé": Employ,
    "surveillants": Supervisor
};

// POST /staff
async function createStaff(req, res) {
    try {
        const { type, name, last_name, phone, role, salary, status } = req.body;

        const Model = MODEL_BY_TYPE[type];
        if (!Model) {
            return res.status(400).json({ message: "type invalide (employé ou surveillants)" });
        }

        const staff = await Model.create({ name, last_name, phone, role, salary, status });
        res.status(201).json({ staff });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Erreur lors de la création" });
    }
}

module.exports = { createStaff };