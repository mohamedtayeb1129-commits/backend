const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Zone  = sequelize.define("zone",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    label:{
        type:DataTypes.STRING,
    },
    amount:{
        type:DataTypes.DOUBLE,
    },
    amount_yearly:{
        type:DataTypes.DOUBLE,
    },
    is_deleted : {
        type:DataTypes.BOOLEAN,
        defaultValue:false
    }
    
})
module.exports = Zone
