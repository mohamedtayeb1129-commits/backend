const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Supervisor  = sequelize.define("supervisors",{
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
        type:DataTypes.ENUM(
  'قيم(ة)',
  'نائب مدير',
  'كاتب(ة)',
  'مدير(ة)',
  ),
    },
    salary :{
        type:DataTypes.DECIMAL(10, 2),
    },
     joined_date :{
        type:DataTypes.DATEONLY,
    },
    status:{
        type:DataTypes.ENUM('نشط', 'في إجازة', 'غير نشط'),
    },
    is_deleted:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    },
})
module.exports = Supervisor
