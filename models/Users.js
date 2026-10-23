const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const Supervisor = require("./Supervisor");

const User  = sequelize.define("user",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    name:{
        type:DataTypes.STRING,
    },
    last_name:{
        type:DataTypes.STRING,
    },
    email:{
        type:DataTypes.STRING,
        allowNull:false
    },
    password:{
        type:DataTypes.STRING,
        allowNull:false
    },
    role:{
        type:DataTypes.ENUM("كاتب(ة)","مدير"),
        defaultValue:"مدير"
    },
    supervisor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references:{
            key:"id",
            model:Supervisor
        }
        },
    is_deleted : {
        type:DataTypes.BOOLEAN,
        defaultValue:false
    }
})
module.exports = User