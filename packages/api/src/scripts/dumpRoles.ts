import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({
        include: {
            roles: {
                include: {
                    role: true
                }
            }
        }
    })

    console.log("=== USER ROLES ===")
    for (const user of users) {
        const roleNames = user.roles.map(ur => ur.role.name)
        console.log(`${user.email}: [${roleNames.join(', ')}]`)
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
