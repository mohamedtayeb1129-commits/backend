const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Student  = sequelize.define("students",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    name:{
        type:DataTypes.STRING,
    },
    unique_id:{
        type:DataTypes.STRING,
    },
    last_name:{
        type:DataTypes.STRING,
    },
    father_name:{
        type:DataTypes.STRING,
    },
    mother_name:{
        type:DataTypes.STRING,
    },
    father_phone:{
        type:DataTypes.STRING,
    },
    mother_phone:{
        type:DataTypes.STRING,
    },
    address:{
        type:DataTypes.STRING,
    },
    class:{
        type:DataTypes.STRING,
    },
    gender:{
        type:DataTypes.ENUM("بنت", "ولد"),
    },
    birthday:{
        type:DataTypes.DATEONLY,
    },
    is_deleted:{
        type:DataTypes.BOOLEAN,
        defaultValue:false
    },
})
module.exports = Student
