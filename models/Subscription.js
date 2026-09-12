const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Teacher = require("./Teacher");
const Student = require("./Student");
const Zone = require("./Zone");

const Subscription  = sequelize.define("subscriptions",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    amount:{
        type:DataTypes.DOUBLE,
    },
    transport:{
        type:DataTypes.BOOLEAN
    },
    payment_type:{
        type:DataTypes.ENUM('يدفع شهريًا',
            'يدفع بالثلاثي',
            'يدفع سنويًا',
            'غير معني بالدفع'),
    },
    status:{
        type:DataTypes.ENUM("payé","en attente","non payé"),
        defaultValue:"payé"
    },
    is_take_book:{
        type:DataTypes.BOOLEAN
    },
    is_take_uniform:{
        type:DataTypes.BOOLEAN
    },
    promotion:{
        type:DataTypes.ENUM('discount_50','free'),
        allowNull:true,
        defaultValue:null
    },
    siblings_count:{
        type:DataTypes.INTEGER,
        allowNull:true
    },
    student_id:{
        type:DataTypes.BIGINT,
        references:{
            model:Student,
            key:"id"
        }
    },
    zone_id:{
        type:DataTypes.BIGINT,
        references:{
            model:Zone,
            key:"id"
        }
    },
    
})
module.exports = Subscription