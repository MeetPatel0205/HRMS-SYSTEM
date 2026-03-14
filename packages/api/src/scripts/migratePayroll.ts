import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Payroll Data Migration...');

    // 1. Create a legacy standard Salary Structure
    let legacyStructure = await prisma.salaryStructure.findFirst({
        where: { name: 'Legacy Hourly Structure' }
    });

    if (!legacyStructure) {
        console.log('Creating legacy Salary Structure and Components...');
        
        const basicComponent = await prisma.salaryComponent.create({
            data: {
                name: 'Basic Pay',
                type: 'EARNING',
                formula: 'CTC * 1.0',
                isStatutory: false
            }
        });

        const benefitComponent = await prisma.salaryComponent.create({
            data: {
                name: 'Benefits Deduction',
                type: 'DEDUCTION',
                formula: 'BENEFIT_FIXED_AMOUNT', // This can be handled by rule or custom
                isStatutory: false
            }
        });

        legacyStructure = await prisma.salaryStructure.create({
            data: {
                name: 'Legacy Hourly Structure',
                description: 'Auto-generated structure for migrated employees',
            }
        });

        await prisma.salaryStructureComponent.createMany({
            data: [
                { structureId: legacyStructure.id, componentId: basicComponent.id, orderIndex: 1 },
                { structureId: legacyStructure.id, componentId: benefitComponent.id, orderIndex: 2 }
            ]
        });
    }

    // 2. Migrate Employees
    const employees = await prisma.employee.findMany();
    let migratedCount = 0;

    for (const emp of employees) {
        // Read raw json from prisma generic ANY because we might have strict types removing it
        const rawEmp = emp as any;
        if (rawEmp.salaryInfo && typeof rawEmp.salaryInfo === 'object' && rawEmp.salaryInfo.hourlyRate) {
            const hourlyRate = Number(rawEmp.salaryInfo.hourlyRate) || 0;
            const annualCTC = hourlyRate * 2080; // 40 hours/week * 52 weeks

            // Check if version already exists
            const existingVersion = await prisma.employeeSalaryVersion.findFirst({
                where: { employeeId: emp.id }
            });

            if (!existingVersion && annualCTC > 0) {
                await prisma.employeeSalaryVersion.create({
                    data: {
                        employeeId: emp.id,
                        structureId: legacyStructure.id,
                        annualCTC: annualCTC,
                        effectiveFrom: emp.createdAt || new Date('2020-01-01')
                    }
                });
                migratedCount++;
            }
        }
    }

    console.log(`Migration completed successfully! Migrated ${migratedCount} employees.`);
}

main()
    .catch((e) => {
        console.error('Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
