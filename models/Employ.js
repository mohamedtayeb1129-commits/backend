const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Employ  = sequelize.define("employs",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
     cin:{
        type:DataTypes.STRING,
    },
    name:{
        type:DataTypes.STRING,
    },
    last_name:{
        type:DataTypes.STRING,
    },
    phone:{
        type:DataTypes.STRING,
    },
    role:{
        type:DataTypes.ENUM('كاتب(ة)',
        'محاسب(ة)',
        'سائق',
        'عامل(ة) نظافة',
        'عون أمن',),

    },
    joined_date :{
        type:DataTypes.DATEONLY,
    },
    salary :{
        type:DataTypes.DECIMAL(10, 2),
    },
    status:{
        type:DataTypes.ENUM("نشط", "في إجازة", "غير نشط"),
    },
     is_deleted:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    },
})
module.exports = Employ
