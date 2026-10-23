require("dotenv").config();

const sequelize = require("../config/db");
const bcrypt = require("bcryptjs");
const TuitionFee = require("../models/TuitionFee");
const { types } = require("pg");
async function createAdmin (){
    try{
        await sequelize.sync();
    
    const data = [
        { level: 'التحضيري', amount: 30, type:"monthly" },
        { level: 'السنة الأولى', amount: 85, type:"monthly" },
        { level: 'السنة الثانية', amount: 85, type:"monthly" },
        { level: 'السنة الثالثة', amount: 85, type:"monthly" },
        { level: 'السنة الرابعة', amount: 85, type:"monthly" },
        { level: 'السنة الخامسة', amount: 85, type:"monthly" },
        { level: 'السنة السادسة', amount: 85, type:"monthly" },
        { level: 'التحضيري', amount: 300, type:"yearly" },
        { level: 'السنة الأولى', amount: 850, type:"yearly" },
        { level: 'السنة الثانية', amount: 850, type:"yearly" },
        { level: 'السنة الثالثة', amount: 850, type:"yearly" },
        { level: 'السنة الرابعة', amount: 850, type:"yearly" },
        { level: 'السنة الخامسة', amount: 850, type:"yearly" },
        { level: 'السنة السادسة', amount: 850, type:"yearly" },
    ]
    for(const d of data){
        await TuitionFee.create({label:d.level,amount:d.amount,type:d.type})
    }
    console.log("price created");
    process.exit();
    }catch(err){
        console.log(err);
        process.exit();
    }
}
createAdmin()