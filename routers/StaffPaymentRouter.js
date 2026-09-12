const express = require("express");
const { confirmStaffPayment, getStaffSalaries } = require("../controllers/StaffPaymentController");
const router = express.Router()

router.get(
    "/staff-salaries",
    getStaffSalaries
);

router.post(
    "/staff-payments/confirm",
    confirmStaffPayment
);

module.exports = router