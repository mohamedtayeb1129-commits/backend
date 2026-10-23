const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Subscription = require("./Subscription");

const StudentPayment  = sequelize.define("student_payments",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    amount:{
        type:DataTypes.DOUBLE,
    },
    date:{
        type:DataTypes.DATE,
    },
    subscription_id:{
        type:DataTypes.BIGINT,
        references:{
            model:Subscription,
            key:"id"
        }
    },
    
})
module.exports = StudentPayment
