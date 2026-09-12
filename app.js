const express = require("express");
const router = express.Router()
const AuthRouter = require("./routers/AuthRouter")
const StudentRouter = require("./routers/StudentRouter")
const TeacherRouter = require("./routers/TeacherRouter")
const SupervisorRouter = require("./routers/SupervisorRouter")
const EmployRouter = require("./routers/EmployRouter")
const AbsenceRouter = require("./routers/AbsenceRouter")
const ScoringRouter = require("./routers/ScoringRouter")
const SubscriptionRouter = require("./routers/SubscriptionRouter")
const PriceRouter = require("./routers/PriceRouter")
const ZoneRouter = require("./routers/ZoneRouter")
const TeacherPaymentRoutes = require("./routers/TeacherPaymentRoutes")
const DashboardRouter = require("./routers/DashboardRouter")
const PurchaseRouter = require("./routers/PurchaseRouter")
const SchoolInfoRouter = require("./routers/SchoolInfoRouter")
const DownloadRouter = require("./routers/DownloadRouter")
const DaycareBooksFee = require("./routers/DaycareBooksFee");
const activityLogRoutes = require("./routers/activityLogRoutes");
const StaffPaymentRouter = require("./routers/StaffPaymentRouter");
const AuthenticateToken = require("./middlewares/AuthenticateToken");

router.use("/auth",AuthRouter)
router.use("/student",AuthenticateToken,StudentRouter)
router.use("/teacher",AuthenticateToken,TeacherRouter)
router.use("/supervisor",AuthenticateToken,SupervisorRouter)
router.use("/employ",AuthenticateToken,EmployRouter)
router.use("/absence",AbsenceRouter)
router.use("/scoring",ScoringRouter)
router.use("/subscription",SubscriptionRouter)
router.use("/price",AuthenticateToken,PriceRouter)
router.use("/zone",AuthenticateToken,ZoneRouter)
router.use("/teacher-payment",AuthenticateToken,TeacherPaymentRoutes)
router.use("/dashboard",DashboardRouter)
router.use("/purchase",AuthenticateToken,PurchaseRouter)
router.use("/school-info",SchoolInfoRouter)
router.use("/download",DownloadRouter)
router.use("/daycare-books-fee",AuthenticateToken,DaycareBooksFee)
router.use("/activity-logs", activityLogRoutes);
router.use("/staff-payment",AuthenticateToken,StaffPaymentRouter);

module.exports = router