const express = require("express");
const router = express.Router();
const {
    getDaycareBooksFees,
    updateDaycareBooksFees,
    updateSingleLevel,
} = require("../controllers/DaycareBooksFee");

router.get("/", getDaycareBooksFees);
router.put("/", updateDaycareBooksFees);
router.patch("/:levelId", updateSingleLevel);

module.exports = router;