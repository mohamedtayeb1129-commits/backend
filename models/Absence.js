const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Absence  = sequelize.define("absences",{
    id:{
        type:DataTypes.BIGINT,
        primaryKey:true,
        autoIncrement:true
    },
    reason:{
        type:DataTypes.STRING,
    },
    date:{
        type:DataTypes.DATEONLY,
    },
    justification:{
        type:DataTypes.BOOLEAN,
    },
    person_type:{
        type:DataTypes.ENUM("employé","élève","surveillants","maître"),
    },
    
    person_id:{
        type:DataTypes.BIGINT,
    },
    
}, {
    hooks: {
        afterCreate: async (absence) => {
            await syncStaffSalary(absence.person_type, absence.person_id, absence.date);
        },
        afterUpdate: async (absence) => {
            // Si la date ou la personne a changé, il faut recalculer l'ancienne période aussi
            const prevDate = absence.previous("date");
            const prevPersonId = absence.previous("person_id");
            const prevPersonType = absence.previous("person_type");

            if (prevDate) {
                await syncStaffSalary(prevPersonType, prevPersonId, prevDate);
            }
            await syncStaffSalary(absence.person_type, absence.person_id, absence.date);
        },
        afterDestroy: async (absence) => {
            await syncStaffSalary(absence.person_type, absence.person_id, absence.date);
        }
    }
});

async function syncStaffSalary(personType, personId, date) {
    const { recalculateAbsencesForPerson, ABSENCE_TYPE_TO_STAFF_TYPE } = require("../services/staffSalaryService");
    const { getPayPeriodForDateOnly } = require("../services/salaryService");

    const staffPersonType = ABSENCE_TYPE_TO_STAFF_TYPE[personType];
    if (!staffPersonType) return; // "élève" / "maître" ne sont pas payés via StaffSalary

    const { month, year } = getPayPeriodForDateOnly(date);
    await recalculateAbsencesForPerson(staffPersonType, personId, month, year, personType);
}


module.exports = Absence
