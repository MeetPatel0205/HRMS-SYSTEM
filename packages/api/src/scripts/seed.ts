import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { PrismaClient } from '@prisma/client'
import { UserRole, Permission, ROLE_PERMISSIONS } from '@hrms/shared'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // 1. Seed Permissions
  console.log('Seeding permissions...')
  const allPermissions = Object.values(Permission)

  for (const slug of allPermissions) {
    const parts = slug.split('_')
    const action = parts[0]
    const resource = parts.slice(1).join('_') || 'system' // fallback

    await prisma.permission.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        action,
        resource,
        description: `Permission to ${action} ${resource}`
      }
    })
  }

  // 2. Create roles
  console.log('Creating roles...')

  const rolesData = [
    {
      name: UserRole.ADMIN,
      description: 'System Administrator with full access',
      permissions: ROLE_PERMISSIONS[UserRole.ADMIN]
    },
    {
      name: UserRole.HR_MANAGER,
      description: 'HR Manager with comprehensive HR access',
      permissions: ROLE_PERMISSIONS[UserRole.HR_MANAGER]
    },
    {
      name: UserRole.MANAGER,
      description: 'Manager with team management access',
      permissions: ROLE_PERMISSIONS[UserRole.MANAGER]
    },
    {
      name: UserRole.EMPLOYEE,
      description: 'Employee with self-service access',
      permissions: ROLE_PERMISSIONS[UserRole.EMPLOYEE]
    }
  ]

  const createdRoles: Record<string, string> = {} // name -> id

  for (const r of rolesData) {
    const existing = await prisma.role.findUnique({ where: { name: r.name } })
    let roleId = existing?.id

    if (!existing) {
      const newRole = await prisma.role.create({
        data: {
          name: r.name,
          description: r.description
        }
      })
      roleId = newRole.id
      console.log(`Created role: ${r.name}`)
    } else {
      roleId = existing.id
      console.log(`Role exists: ${r.name}`)
    }

    createdRoles[r.name] = roleId

    // Update permissions
    if (roleId && r.permissions && r.permissions.length > 0) {
      // Get permission IDs
      const perms = await prisma.permission.findMany({
        where: { slug: { in: r.permissions } }
      })

      // Clear existing
      await prisma.rolePermission.deleteMany({ where: { roleId } })

      // Add new
      if (perms.length > 0) {
        await prisma.rolePermission.createMany({
          data: perms.map(p => ({
            roleId: roleId!,
            permissionId: p.id,
            assignedBy: 'system'
          }))
        })
      }
    }
  }

  // Create admin user
  console.log('Creating admin user...')

  const hashedPassword = await bcrypt.hash('Admin123!', 12)

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@hrms.com' },
    update: {},
    create: {
      email: 'admin@hrms.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true
    }
  })

  // Assign admin role to admin user
  const adminRoleId = createdRoles[UserRole.ADMIN]
  if (adminRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRoleId
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRoleId,
        assignedBy: adminUser.id
      }
    })
  }

  // Create employee profile for admin user
  console.log('Creating admin employee profile...')

  const adminEmployee = await prisma.employee.upsert({
    where: { email: 'admin@hrms.com' },
    update: {},
    create: {
      employeeNumber: 'EMP20240000',
      userId: adminUser.id,
      firstName: 'System',
      lastName: 'Administrator',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'other',
      email: 'admin@hrms.com',
      phone: '+1-555-0001',
      address: {
        street: '1 Admin Plaza',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        country: 'US'
      },
      emergencyContacts: [
        {
          id: crypto.randomUUID(),
          name: 'Emergency Contact',
          relationship: 'Other',
          phone: '+1-555-0002'
        }
      ],
      hireDate: new Date('2020-01-01'),
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'System Administrator',
      department: 'IT',
      location: 'Headquarters',
      salaryInfo: {
        baseSalary: 100000,
        currency: 'USD',
        payFrequency: 'monthly',
        effectiveDate: new Date('2020-01-01')
      },
      skills: [],
      certifications: [],
      languages: [],
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  })

  // Create HR Manager user
  console.log('Creating HR Manager user...')

  const hrPassword = await bcrypt.hash('HRManager123!', 12)

  const hrUser = await prisma.user.upsert({
    where: { email: 'hr@hrms.com' },
    update: {},
    create: {
      email: 'hr@hrms.com',
      password: hrPassword,
      firstName: 'HR',
      lastName: 'Manager',
      isActive: true
    }
  })

  const hrRoleId = createdRoles[UserRole.HR_MANAGER]
  if (hrRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: hrUser.id,
          roleId: hrRoleId
        }
      },
      update: {},
      create: {
        userId: hrUser.id,
        roleId: hrRoleId,
        assignedBy: adminUser.id
      }
    })
  }

  // Create sample employee for HR Manager
  const hrEmployee = await prisma.employee.upsert({
    where: { email: 'hr@hrms.com' },
    update: {},
    create: {
      employeeNumber: 'EMP20240001',
      userId: hrUser.id,
      firstName: 'HR',
      lastName: 'Manager',
      dateOfBirth: new Date('1985-06-15'),
      gender: 'female',
      email: 'hr@hrms.com',
      phone: '+1-555-0101',
      address: {
        street: '123 Business Ave',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        country: 'US'
      },
      emergencyContacts: [
        {
          id: crypto.randomUUID(),
          name: 'Emergency Contact',
          relationship: 'Spouse',
          phone: '+1-555-0102'
        }
      ],
      hireDate: new Date('2020-01-15'),
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'HR Manager',
      department: 'Human Resources',
      location: 'Headquarters',
      salaryInfo: {
        baseSalary: 75000,
        currency: 'USD',
        payFrequency: 'monthly',
        effectiveDate: new Date('2020-01-15')
      },
      skills: [],
      certifications: [],
      languages: [],
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  })

  // Update HR user with employee ID
  await prisma.user.update({
    where: { id: hrUser.id },
    data: { employee: { connect: { id: hrEmployee.id } } }
  })

  // Create sample manager
  console.log('Creating sample manager...')

  const managerPassword = await bcrypt.hash('Manager123!', 12)

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@hrms.com' },
    update: {},
    create: {
      email: 'manager@hrms.com',
      password: managerPassword,
      firstName: 'John',
      lastName: 'Manager',
      isActive: true
    }
  })

  const managerRoleId = createdRoles[UserRole.MANAGER]
  if (managerRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: managerUser.id,
          roleId: managerRoleId
        }
      },
      update: {},
      create: {
        userId: managerUser.id,
        roleId: managerRoleId,
        assignedBy: adminUser.id
      }
    })
  }

  const managerEmployee = await prisma.employee.upsert({
    where: { email: 'manager@hrms.com' },
    update: {},
    create: {
      employeeNumber: 'EMP20240002',
      userId: managerUser.id,
      firstName: 'John',
      lastName: 'Manager',
      dateOfBirth: new Date('1980-03-20'),
      gender: 'male',
      email: 'manager@hrms.com',
      phone: '+1-555-0201',
      address: {
        street: '456 Manager St',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        country: 'US'
      },
      emergencyContacts: [
        {
          id: crypto.randomUUID(),
          name: 'Manager Emergency',
          relationship: 'Spouse',
          phone: '+1-555-0202'
        }
      ],
      hireDate: new Date('2019-05-01'),
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'Engineering Manager',
      department: 'Engineering',
      location: 'Headquarters',
      salaryInfo: {
        baseSalary: 95000,
        currency: 'USD',
        payFrequency: 'monthly',
        effectiveDate: new Date('2019-05-01')
      },
      skills: [],
      certifications: [],
      languages: [],
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  })

  // Create sample employee
  console.log('Creating sample employee...')

  const employeePassword = await bcrypt.hash('Employee123!', 12)

  const employeeUser = await prisma.user.upsert({
    where: { email: 'employee@hrms.com' },
    update: {},
    create: {
      email: 'employee@hrms.com',
      password: employeePassword,
      firstName: 'Jane',
      lastName: 'Employee',
      isActive: true
    }
  })

  const employeeRoleId = createdRoles[UserRole.EMPLOYEE]
  if (employeeRoleId) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: employeeUser.id,
          roleId: employeeRoleId
        }
      },
      update: {},
      create: {
        userId: employeeUser.id,
        roleId: employeeRoleId,
        assignedBy: adminUser.id
      }
    })
  }

  const employee = await prisma.employee.upsert({
    where: { email: 'employee@hrms.com' },
    update: {},
    create: {
      employeeNumber: 'EMP20240003',
      userId: employeeUser.id,
      firstName: 'Jane',
      lastName: 'Employee',
      dateOfBirth: new Date('1990-08-10'),
      gender: 'female',
      email: 'employee@hrms.com',
      phone: '+1-555-0301',
      address: {
        street: '789 Employee Rd',
        city: 'Business City',
        state: 'BC',
        zipCode: '12345',
        country: 'US'
      },
      emergencyContacts: [
        {
          id: crypto.randomUUID(),
          name: 'Employee Emergency',
          relationship: 'Parent',
          phone: '+1-555-0302'
        }
      ],
      hireDate: new Date('2022-03-15'),
      employmentType: 'full_time',
      status: 'active',
      jobTitle: 'Software Developer',
      department: 'Engineering',
      location: 'Headquarters',
      managerId: managerEmployee.id,
      salaryInfo: {
        baseSalary: 70000,
        currency: 'USD',
        payFrequency: 'monthly',
        effectiveDate: new Date('2022-03-15')
      },
      skills: [],
      certifications: [],
      languages: [],
      createdBy: adminUser.id,
      updatedBy: adminUser.id
    }
  })

  // Create leave types
  console.log('Creating leave types...')

  const leaveTypes = [
    { name: 'Annual Leave', description: 'Yearly vacation days', maxDays: 25, carryOver: true },
    { name: 'Sick Leave', description: 'Medical leave', maxDays: 10, carryOver: false },
    { name: 'Personal Leave', description: 'Personal time off', maxDays: 5, carryOver: false },
    { name: 'Maternity Leave', description: 'Maternity leave', maxDays: 90, carryOver: false },
    { name: 'Paternity Leave', description: 'Paternity leave', maxDays: 14, carryOver: false }
  ]

  for (const leaveType of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { name: leaveType.name },
      update: {},
      create: leaveType
    })
  }

  // Create benefit plans
  console.log('Creating benefit plans...')

  const benefitPlans = [
    {
      name: 'Health Insurance Premium',
      description: 'Comprehensive health insurance coverage',
      type: 'health',
      provider: 'HealthCorp Insurance',
      cost: { employee: 150, employer: 350, family: 450 }
    },
    {
      name: 'Dental Insurance',
      description: 'Dental coverage including preventive care',
      type: 'dental',
      provider: 'DentalCare Plus',
      cost: { employee: 25, employer: 75, family: 125 }
    },
    {
      name: '401(k) Retirement Plan',
      description: 'Company-matched retirement savings plan',
      type: 'retirement',
      provider: 'RetirementCorp',
      cost: { employeeContribution: 'up to 6%', employerMatch: '50% up to 6%' }
    }
  ]

  for (const plan of benefitPlans) {
    const existing = await prisma.benefitPlan.findFirst({
      where: { name: plan.name }
    })

    if (!existing) {
      await prisma.benefitPlan.create({
        data: plan
      })
    }
  }

  // Create training courses
  console.log('Creating training courses...')

  const trainingCourses = [
    {
      title: 'New Employee Orientation',
      description: 'Introduction to company policies and procedures',
      type: 'online',
      duration: 120,
      provider: 'Internal'
    },
    {
      title: 'Workplace Safety Training',
      description: 'Essential workplace safety guidelines',
      type: 'instructor_led',
      duration: 180,
      provider: 'SafetyFirst Corp'
    },
    {
      title: 'Leadership Development',
      description: 'Management and leadership skills development',
      type: 'online',
      duration: 480,
      provider: 'LeadershipAcademy'
    },
    {
      title: 'Data Privacy and Security',
      description: 'GDPR compliance and data security best practices',
      type: 'online',
      duration: 90,
      provider: 'SecurityTraining Inc'
    }
  ]

  for (const course of trainingCourses) {
    const existing = await prisma.trainingCourse.findFirst({
      where: { title: course.title }
    })

    if (!existing) {
      await prisma.trainingCourse.create({
        data: course
      })
    }
  }

  // =============================================
  // 5. Seed Departments
  // =============================================
  console.log('Creating departments...')

  const departmentsData = [
    { name: 'Information Technology', code: 'IT', description: 'Technology and infrastructure', location: 'Headquarters' },
    { name: 'Human Resources', code: 'HR', description: 'People management and development', location: 'Headquarters' },
    { name: 'Engineering', code: 'ENG', description: 'Product development and engineering', location: 'Headquarters' },
    { name: 'Finance', code: 'FIN', description: 'Financial planning and accounting', location: 'Headquarters' },
    { name: 'Marketing', code: 'MKT', description: 'Brand management and marketing', location: 'Remote' },
    { name: 'Operations', code: 'OPS', description: 'Business operations and logistics', location: 'Headquarters' }
  ]

  const createdDepts: Record<string, string> = {}

  for (const dept of departmentsData) {
    const existing = await prisma.department.findUnique({ where: { code: dept.code } })
    if (!existing) {
      const d = await prisma.department.create({ data: dept })
      createdDepts[dept.code] = d.id
      console.log(`  Created department: ${dept.name}`)
    } else {
      createdDepts[dept.code] = existing.id
      console.log(`  Department exists: ${dept.name}`)
    }
  }

  // Create sub-departments (hierarchy)
  const frontendDept = await prisma.department.findFirst({ where: { code: 'FE' } })
  if (!frontendDept && createdDepts['ENG']) {
    await prisma.department.create({
      data: { name: 'Frontend Engineering', code: 'FE', description: 'Frontend development team', parentId: createdDepts['ENG'], location: 'Headquarters' }
    })
    console.log('  Created sub-department: Frontend Engineering')
  }

  const backendDept = await prisma.department.findFirst({ where: { code: 'BE' } })
  if (!backendDept && createdDepts['ENG']) {
    await prisma.department.create({
      data: { name: 'Backend Engineering', code: 'BE', description: 'Backend development team', parentId: createdDepts['ENG'], location: 'Headquarters' }
    })
    console.log('  Created sub-department: Backend Engineering')
  }

  // =============================================
  // 6. Seed Teams & Team Members
  // =============================================
  console.log('Creating teams...')

  const teamsData = [
    { name: 'Core Platform', description: 'Core platform development team', type: 'functional' },
    { name: 'HR Operations', description: 'HR day-to-day operations team', type: 'functional' },
    { name: 'Innovation Squad', description: 'Cross-functional innovation team', type: 'cross-functional' }
  ]

  const createdTeams: Record<string, string> = {}

  for (const team of teamsData) {
    const existing = await prisma.team.findFirst({ where: { name: team.name } })
    if (!existing) {
      const t = await prisma.team.create({ data: team })
      createdTeams[team.name] = t.id
      console.log(`  Created team: ${team.name}`)
    } else {
      createdTeams[team.name] = existing.id
    }
  }

  // Add team members
  if (createdTeams['Core Platform'] && managerEmployee?.id) {
    const exists = await prisma.teamMember.findFirst({
      where: { teamId: createdTeams['Core Platform'], employeeId: managerEmployee.id }
    })
    if (!exists) {
      await prisma.teamMember.create({
        data: { teamId: createdTeams['Core Platform'], employeeId: managerEmployee.id, role: 'lead' }
      })
    }
  }
  if (createdTeams['Core Platform'] && employee?.id) {
    const exists = await prisma.teamMember.findFirst({
      where: { teamId: createdTeams['Core Platform'], employeeId: employee.id }
    })
    if (!exists) {
      await prisma.teamMember.create({
        data: { teamId: createdTeams['Core Platform'], employeeId: employee.id, role: 'member' }
      })
    }
  }
  if (createdTeams['HR Operations'] && hrEmployee?.id) {
    const exists = await prisma.teamMember.findFirst({
      where: { teamId: createdTeams['HR Operations'], employeeId: hrEmployee.id }
    })
    if (!exists) {
      await prisma.teamMember.create({
        data: { teamId: createdTeams['HR Operations'], employeeId: hrEmployee.id, role: 'lead' }
      })
    }
  }

  // =============================================
  // 7. Seed Time Entries
  // =============================================
  console.log('Creating time entries...')

  const now = new Date()
  const existingTimeEntries = await prisma.timeEntry.count()

  if (existingTimeEntries === 0) {
    for (let i = 0; i < 10; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const empId = i % 2 === 0 ? employee.id : managerEmployee.id

      const clockIn = new Date(date)
      clockIn.setHours(9, 0, 0, 0)
      const clockOut = new Date(date)
      clockOut.setHours(17 + (i % 3 === 0 ? 1 : 0), 30, 0, 0)

      const totalH = (clockOut.getTime() - clockIn.getTime()) / 3600000
      const regularH = Math.min(totalH, 8)
      const overtimeH = Math.max(0, totalH - 8)

      await prisma.timeEntry.create({
        data: {
          employeeId: empId,
          date,
          clockIn,
          clockOut,
          breaks: [{ start: '12:00', end: '12:30', type: 'lunch' }],
          totalHours: parseFloat(totalH.toFixed(2)),
          regularHours: parseFloat(regularH.toFixed(2)),
          overtimeHours: parseFloat(overtimeH.toFixed(2)),
          status: i < 3 ? 'pending' : 'approved',
          approvedBy: i >= 3 ? managerEmployee.id : null,
          notes: i === 0 ? 'Working on sprint tasks' : null
        }
      })
    }
    console.log('  Created 10 time entries')
  }

  // =============================================
  // 8. Seed Leave Balances
  // =============================================
  console.log('Creating leave balances...')

  const allLeaveTypes = await prisma.leaveType.findMany()
  const allEmployees = [employee, managerEmployee, hrEmployee, adminEmployee]
  const currentYear = now.getFullYear()

  for (const emp of allEmployees) {
    for (const lt of allLeaveTypes) {
      const existing = await prisma.leaveBalance.findFirst({
        where: { employeeId: emp.id, leaveTypeId: lt.id, year: currentYear }
      })
      if (!existing) {
        await prisma.leaveBalance.create({
          data: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
            totalDays: lt.maxDays || 10,
            usedDays: Math.floor(Math.random() * 5)
          }
        })
      }
    }
  }
  console.log('  Created leave balances for all employees')

  // =============================================
  // 9. Seed Leave Requests
  // =============================================
  console.log('Creating leave requests...')

  const existingLeaveReqs = await prisma.leaveRequest.count()
  if (existingLeaveReqs === 0 && allLeaveTypes.length > 0) {
    const leaveRequestsData = [
      {
        employeeId: employee.id,
        leaveTypeId: allLeaveTypes[0].id, // Annual Leave
        startDate: new Date(currentYear, 3, 10),
        endDate: new Date(currentYear, 3, 14),
        totalDays: 5,
        reason: 'Family vacation',
        status: 'approved'
      },
      {
        employeeId: employee.id,
        leaveTypeId: allLeaveTypes[1].id, // Sick Leave
        startDate: new Date(currentYear, 1, 5),
        endDate: new Date(currentYear, 1, 6),
        totalDays: 2,
        reason: 'Medical appointment and recovery',
        status: 'approved'
      },
      {
        employeeId: managerEmployee.id,
        leaveTypeId: allLeaveTypes[0].id,
        startDate: new Date(currentYear, 5, 1),
        endDate: new Date(currentYear, 5, 5),
        totalDays: 5,
        reason: 'Personal travel',
        status: 'pending'
      },
      {
        employeeId: hrEmployee.id,
        leaveTypeId: allLeaveTypes[2].id, // Personal Leave
        startDate: new Date(currentYear, 6, 15),
        endDate: new Date(currentYear, 6, 15),
        totalDays: 1,
        reason: 'Personal errands',
        status: 'rejected'
      }
    ]

    for (const lr of leaveRequestsData) {
      await prisma.leaveRequest.create({
        data: {
          ...lr,
          approvalWorkflow: [{ step: 1, approver: 'manager', status: lr.status }],
          attachments: []
        }
      })
    }
    console.log('  Created 4 leave requests')
  }

  // =============================================
  // 10. Seed Performance Reviews
  // =============================================
  console.log('Creating performance reviews...')

  const existingReviews = await prisma.performanceReview.count()
  if (existingReviews === 0) {
    const reviewsData = [
      {
        employeeId: employee.id,
        reviewerId: managerEmployee.id,
        reviewPeriodStart: new Date(currentYear - 1, 0, 1),
        reviewPeriodEnd: new Date(currentYear - 1, 11, 31),
        reviewType: 'annual',
        status: 'completed',
        overallRating: 4.2,
        goals: [{ title: 'Complete 3 feature modules', weight: 40, rating: 4.5 }, { title: 'Improve code coverage to 80%', weight: 30, rating: 3.8 }],
        competencies: [{ name: 'Technical Skills', rating: 4.5 }, { name: 'Communication', rating: 4.0 }, { name: 'Teamwork', rating: 4.3 }],
        feedback: { strengths: 'Strong technical skills and quick learner', improvements: 'Could improve documentation practices', managerComments: 'Excellent year overall' },
        peerFeedback: [{ reviewer: 'Peer 1', feedback: 'Great team player' }],
        submittedAt: new Date(currentYear, 0, 15),
        approvedAt: new Date(currentYear, 0, 20)
      },
      {
        employeeId: managerEmployee.id,
        reviewerId: adminEmployee.id,
        reviewPeriodStart: new Date(currentYear - 1, 0, 1),
        reviewPeriodEnd: new Date(currentYear - 1, 11, 31),
        reviewType: 'annual',
        status: 'completed',
        overallRating: 4.5,
        goals: [{ title: 'Successfully lead team of 5', weight: 50, rating: 4.8 }],
        competencies: [{ name: 'Leadership', rating: 4.7 }, { name: 'Strategic Thinking', rating: 4.3 }],
        feedback: { strengths: 'Exceptional leadership and mentoring', improvements: 'Delegate more effectively', managerComments: 'Top performer' },
        peerFeedback: [{ reviewer: 'Peer 1', feedback: 'Inspiring leader' }],
        submittedAt: new Date(currentYear, 0, 10),
        approvedAt: new Date(currentYear, 0, 18)
      },
      {
        employeeId: employee.id,
        reviewerId: managerEmployee.id,
        reviewPeriodStart: new Date(currentYear, 0, 1),
        reviewPeriodEnd: new Date(currentYear, 5, 30),
        reviewType: 'mid_year',
        status: 'draft',
        goals: [{ title: 'Deliver Q1-Q2 milestones', weight: 50, rating: null }],
        competencies: [],
        feedback: { strengths: '', improvements: '', managerComments: '' },
        peerFeedback: []
      }
    ]

    for (const review of reviewsData) {
      await prisma.performanceReview.create({ data: review })
    }
    console.log('  Created 3 performance reviews')
  }

  // =============================================
  // 11. Seed Benefit Enrollments
  // =============================================
  console.log('Creating benefit enrollments...')

  const allPlans = await prisma.benefitPlan.findMany()
  const existingEnrollments = await prisma.benefitEnrollment.count()

  if (existingEnrollments === 0 && allPlans.length > 0) {
    const enrollmentsData = [
      { employeeId: employee.id, benefitPlanId: allPlans[0].id, elections: { coverage: 'individual', tier: 'standard' } },
      { employeeId: employee.id, benefitPlanId: allPlans[1].id, elections: { coverage: 'individual' } },
      { employeeId: managerEmployee.id, benefitPlanId: allPlans[0].id, elections: { coverage: 'family', tier: 'premium' } },
      { employeeId: hrEmployee.id, benefitPlanId: allPlans[0].id, elections: { coverage: 'individual', tier: 'standard' } }
    ]

    for (const enr of enrollmentsData) {
      await prisma.benefitEnrollment.create({
        data: {
          ...enr,
          enrollmentDate: new Date(currentYear, 0, 1),
          effectiveDate: new Date(currentYear, 0, 1),
          status: 'active'
        }
      })
    }
    console.log('  Created 4 benefit enrollments')
  }

  // =============================================
  // 12. Seed Training Records
  // =============================================
  console.log('Creating training records...')

  const allCourses = await prisma.trainingCourse.findMany()
  const existingRecords = await prisma.trainingRecord.count()

  if (existingRecords === 0 && allCourses.length > 0) {
    const recordsData = [
      { employeeId: employee.id, trainingCourseId: allCourses[0].id, status: 'completed', score: 95, completionDate: new Date(currentYear, 0, 15) },
      { employeeId: employee.id, trainingCourseId: allCourses[3].id, status: 'enrolled', score: null, completionDate: null },
      { employeeId: managerEmployee.id, trainingCourseId: allCourses[2].id, status: 'completed', score: 88, completionDate: new Date(currentYear - 1, 8, 30) },
      { employeeId: hrEmployee.id, trainingCourseId: allCourses[0].id, status: 'completed', score: 92, completionDate: new Date(currentYear, 0, 10) }
    ]

    for (const rec of recordsData) {
      await prisma.trainingRecord.create({
        data: {
          ...rec,
          enrollmentDate: new Date(currentYear - 1, 11, 15)
        }
      })
    }
    console.log('  Created 4 training records')
  }

  // =============================================
  // 13. Seed Payroll Entries
  // =============================================
  console.log('Creating payroll entries...')

  const existingPayroll = await prisma.payrollEntry.count()
  if (existingPayroll === 0) {
    const payrollData = [
      { employeeId: adminEmployee.id, grossPay: 8333.33, taxWithholding: 2083.33, netPay: 5750.00 },
      { employeeId: hrEmployee.id, grossPay: 6250.00, taxWithholding: 1562.50, netPay: 4312.50 },
      { employeeId: managerEmployee.id, grossPay: 7916.67, taxWithholding: 1979.17, netPay: 5437.50 },
      { employeeId: employee.id, grossPay: 5833.33, taxWithholding: 1458.33, netPay: 3958.33 }
    ]

    for (const p of payrollData) {
      await prisma.payrollEntry.create({
        data: {
          ...p,
          payPeriodStart: new Date(currentYear, now.getMonth() - 1, 1),
          payPeriodEnd: new Date(currentYear, now.getMonth(), 0),
          deductions: { health: 150, dental: 25, retirement: 350 },
          status: 'processed',
          processedAt: new Date(currentYear, now.getMonth(), 1)
        }
      })
    }
    console.log('  Created 4 payroll entries')
  }

  // =============================================
  // 14. Seed Job Postings, Applications, Interviews
  // =============================================
  console.log('Creating recruitment data...')

  const existingPostings = await prisma.jobPosting.count()
  if (existingPostings === 0) {
    const posting1 = await prisma.jobPosting.create({
      data: {
        title: 'Senior Full-Stack Developer',
        department: 'Engineering',
        location: 'Headquarters',
        description: 'We are looking for a senior full-stack developer to join our core platform team.',
        requirements: ['5+ years experience', 'React & Node.js', 'SQL databases', 'REST APIs'],
        salaryRange: { min: 90000, max: 130000, currency: 'USD' },
        status: 'published',
        publishedAt: new Date(currentYear, 1, 1)
      }
    })

    const posting2 = await prisma.jobPosting.create({
      data: {
        title: 'HR Business Partner',
        department: 'Human Resources',
        location: 'Headquarters',
        description: 'Seeking an experienced HR business partner to support our growing teams.',
        requirements: ['3+ years HR experience', 'SHRM certification preferred', 'Strong communication'],
        salaryRange: { min: 65000, max: 85000, currency: 'USD' },
        status: 'published',
        publishedAt: new Date(currentYear, 1, 15)
      }
    })

    // Applications
    const app1 = await prisma.application.create({
      data: {
        jobPostingId: posting1.id,
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice.johnson@email.com',
        phone: '+1-555-1001',
        resumeUrl: '/uploads/resumes/alice_johnson.pdf',
        status: 'interview',
        score: 85
      }
    })

    const app2 = await prisma.application.create({
      data: {
        jobPostingId: posting1.id,
        firstName: 'Bob',
        lastName: 'Williams',
        email: 'bob.williams@email.com',
        phone: '+1-555-1002',
        resumeUrl: '/uploads/resumes/bob_williams.pdf',
        status: 'screening',
        score: 72
      }
    })

    await prisma.application.create({
      data: {
        jobPostingId: posting2.id,
        firstName: 'Carol',
        lastName: 'Davis',
        email: 'carol.davis@email.com',
        phone: '+1-555-1003',
        resumeUrl: '/uploads/resumes/carol_davis.pdf',
        status: 'submitted'
      }
    })

    // Interviews
    await prisma.interview.create({
      data: {
        applicationId: app1.id,
        scheduledAt: new Date(currentYear, 2, 10, 10, 0),
        status: 'completed',
        completedAt: new Date(currentYear, 2, 10, 11, 0),
        rating: 4.5,
        notes: 'Strong technical skills, excellent cultural fit'
      }
    })

    await prisma.interview.create({
      data: {
        applicationId: app1.id,
        scheduledAt: new Date(currentYear, 2, 15, 14, 0),
        status: 'scheduled',
        notes: 'Final round with engineering lead'
      }
    })

    console.log('  Created 2 postings, 3 applications, 2 interviews')
  }

  // =============================================
  // 15. Seed Onboarding Checklist
  // =============================================
  console.log('Creating onboarding checklist...')

  const existingOnboarding = await prisma.onboardingChecklist.findFirst({
    where: { employeeId: employee.id }
  })

  if (!existingOnboarding) {
    await prisma.onboardingChecklist.create({
      data: {
        employeeId: employee.id,
        tasks: [
          { id: 1, title: 'Complete I-9 form', completed: true, completedAt: '2022-03-16' },
          { id: 2, title: 'Set up workstation', completed: true, completedAt: '2022-03-15' },
          { id: 3, title: 'IT account setup', completed: true, completedAt: '2022-03-15' },
          { id: 4, title: 'Orientation session', completed: true, completedAt: '2022-03-17' },
          { id: 5, title: 'Benefits enrollment', completed: true, completedAt: '2022-03-20' },
          { id: 6, title: 'Meet team members', completed: true, completedAt: '2022-03-16' },
          { id: 7, title: 'Complete safety training', completed: true, completedAt: '2022-03-22' },
          { id: 8, title: '30-day check-in', completed: true, completedAt: '2022-04-15' }
        ],
        status: 'completed',
        startDate: new Date('2022-03-15'),
        dueDate: new Date('2022-04-15'),
        completedAt: new Date('2022-04-15')
      }
    })
    console.log('  Created onboarding checklist')
  }

  // =============================================
  // 16. Seed Documents
  // =============================================
  console.log('Creating documents...')

  const existingDocs = await prisma.document.count()
  if (existingDocs === 0) {
    await prisma.document.create({
      data: {
        title: 'Employee Handbook 2026',
        description: 'Comprehensive guide to company policies, benefits, and procedures',
        type: 'policy',
        fileUrl: '/uploads/documents/employee_handbook_2026.pdf',
        category: 'hr_policy',
        status: 'active'
      }
    })

    await prisma.document.create({
      data: {
        title: 'Code of Conduct',
        description: 'Company code of conduct and ethics policy',
        type: 'policy',
        fileUrl: '/uploads/documents/code_of_conduct.pdf',
        category: 'compliance',
        status: 'active'
      }
    })

    await prisma.document.create({
      data: {
        title: 'Non-Disclosure Agreement Template',
        description: 'Standard NDA template for new hires',
        type: 'contract',
        fileUrl: '/uploads/documents/nda_template.pdf',
        category: 'legal',
        status: 'active'
      }
    })
    console.log('  Created 3 documents')
  }

  // =============================================
  // 17. Seed Goals
  // =============================================
  console.log('Creating goals...')

  const existingGoals = await prisma.goal.count()
  if (existingGoals === 0) {
    const companyGoal = await prisma.goal.create({
      data: {
        employeeId: adminEmployee.id,
        title: 'Achieve 20% Revenue Growth',
        description: 'Company-wide objective to grow annual revenue by 20%',
        type: 'company',
        category: 'business',
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        status: 'in_progress',
        progress: 35,
        targetValue: 20,
        currentValue: 7,
        unit: 'percent',
        metric: 'Revenue growth %'
      }
    })

    await prisma.goal.create({
      data: {
        employeeId: managerEmployee.id,
        title: 'Deliver 3 Major Feature Releases',
        description: 'Ship three major product feature releases this year',
        type: 'team',
        category: 'delivery',
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        status: 'in_progress',
        progress: 33,
        targetValue: 3,
        currentValue: 1,
        unit: 'releases',
        parentId: companyGoal.id
      }
    })

    await prisma.goal.create({
      data: {
        employeeId: employee.id,
        title: 'Achieve 85% Code Coverage',
        description: 'Increase unit test code coverage to 85% across all modules',
        type: 'individual',
        category: 'quality',
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 5, 30),
        status: 'in_progress',
        progress: 60,
        targetValue: 85,
        currentValue: 72,
        unit: 'percent',
        metric: 'Code coverage %'
      }
    })

    await prisma.goal.create({
      data: {
        employeeId: hrEmployee.id,
        title: 'Reduce Time-to-Hire to 30 Days',
        description: 'Optimize recruitment process to reduce average time-to-hire',
        type: 'individual',
        category: 'efficiency',
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        status: 'in_progress',
        progress: 45,
        targetValue: 30,
        currentValue: 38,
        unit: 'days',
        metric: 'Average days to hire'
      }
    })
    console.log('  Created 4 goals')
  }

  // =============================================
  // 18. Seed Projects & Tasks
  // =============================================
  console.log('Creating projects and tasks...')

  const existingProjects = await prisma.project.count()
  if (existingProjects === 0) {
    const project1 = await prisma.project.create({
      data: {
        name: 'HRMS Platform v2.0',
        description: 'Major platform upgrade with new modules and improved UX',
        startDate: new Date(currentYear, 0, 15),
        endDate: new Date(currentYear, 8, 30),
        status: 'active',
        priority: 'high',
        budget: 250000,
        teamId: createdTeams['Core Platform'] || null
      }
    })

    const project2 = await prisma.project.create({
      data: {
        name: 'Employee Wellness Portal',
        description: 'Build a new wellness tracking and engagement portal',
        startDate: new Date(currentYear, 2, 1),
        endDate: new Date(currentYear, 6, 31),
        status: 'active',
        priority: 'medium',
        budget: 75000
      }
    })

    // Tasks for Project 1
    const tasksP1 = [
      { title: 'Design new dashboard layout', status: 'completed', priority: 'high', estimatedHours: 40, actualHours: 35 },
      { title: 'Implement time tracking module', status: 'in_progress', priority: 'high', estimatedHours: 80, actualHours: 45 },
      { title: 'Build leave management workflow', status: 'in_progress', priority: 'medium', estimatedHours: 60, actualHours: 20 },
      { title: 'Create payroll integration API', status: 'todo', priority: 'high', estimatedHours: 100, actualHours: 0 }
    ]

    for (const task of tasksP1) {
      await prisma.task.create({
        data: {
          projectId: project1.id,
          ...task,
          assigneeId: employee.id,
          dueDate: new Date(currentYear, 5, 30)
        }
      })
    }

    // Tasks for Project 2
    const tasksP2 = [
      { title: 'Research wellness platform requirements', status: 'completed', priority: 'high', estimatedHours: 20, actualHours: 18 },
      { title: 'Design wellness dashboard mockups', status: 'in_progress', priority: 'medium', estimatedHours: 30, actualHours: 10 }
    ]

    for (const task of tasksP2) {
      await prisma.task.create({
        data: {
          projectId: project2.id,
          ...task,
          dueDate: new Date(currentYear, 4, 15)
        }
      })
    }
    console.log('  Created 2 projects, 6 tasks')
  }

  // =============================================
  // 19. Seed Schedules & Shifts
  // =============================================
  console.log('Creating schedules and shifts...')

  const existingSchedules = await prisma.schedule.count()
  if (existingSchedules === 0) {
    const schedule = await prisma.schedule.create({
      data: {
        name: 'Standard Work Week',
        description: 'Regular Monday-Friday 9AM-5PM schedule',
        type: 'fixed',
        timezone: 'America/New_York',
        startDate: new Date(currentYear, 0, 1),
        endDate: new Date(currentYear, 11, 31),
        status: 'active',
        rules: { daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'], startTime: '09:00', endTime: '17:00' }
      }
    })

    // Create shifts for this week
    for (let d = 0; d < 4; d++) {
      const shiftDate = new Date(now)
      shiftDate.setDate(shiftDate.getDate() - d)
      const dayOfWeek = shiftDate.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) continue // Skip weekends

      const startTime = new Date(shiftDate)
      startTime.setHours(9, 0, 0, 0)
      const endTime = new Date(shiftDate)
      endTime.setHours(17, 0, 0, 0)

      await prisma.shift.create({
        data: {
          scheduleId: schedule.id,
          employeeId: employee.id,
          startTime,
          endTime,
          breakDuration: 30,
          type: 'regular',
          status: d === 0 ? 'scheduled' : 'completed'
        }
      })
    }
    console.log('  Created 1 schedule with shifts')
  }

  // =============================================
  // 20. Seed Expense Reports & Items
  // =============================================
  console.log('Creating expense reports...')

  const existingExpenses = await prisma.expenseReport.count()
  if (existingExpenses === 0) {
    const expReport1 = await prisma.expenseReport.create({
      data: {
        employeeId: managerEmployee.id,
        title: 'Q1 Business Travel - Client Meetings',
        description: 'Travel expenses for client meetings in New York',
        totalAmount: 1250.75,
        currency: 'USD',
        status: 'approved',
        submittedAt: new Date(currentYear, 2, 5),
        approvedBy: adminUser.id,
        approvedAt: new Date(currentYear, 2, 8)
      }
    })

    const expReport2 = await prisma.expenseReport.create({
      data: {
        employeeId: employee.id,
        title: 'Conference Registration & Travel',
        description: 'Tech conference attendance expenses',
        totalAmount: 850.00,
        currency: 'USD',
        status: 'pending',
        submittedAt: new Date(currentYear, 2, 20)
      }
    })

    // Expense Items for Report 1
    await prisma.expenseItem.create({
      data: { reportId: expReport1.id, category: 'airfare', description: 'Round-trip flight to NYC', amount: 450.00, date: new Date(currentYear, 1, 20), merchant: 'Delta Airlines' }
    })
    await prisma.expenseItem.create({
      data: { reportId: expReport1.id, category: 'hotel', description: '2 nights hotel stay', amount: 600.00, date: new Date(currentYear, 1, 20), merchant: 'Marriott Hotels' }
    })
    await prisma.expenseItem.create({
      data: { reportId: expReport1.id, category: 'meals', description: 'Business dinners', amount: 200.75, date: new Date(currentYear, 1, 21), merchant: 'Various restaurants' }
    })

    // Expense Items for Report 2
    await prisma.expenseItem.create({
      data: { reportId: expReport2.id, category: 'conference', description: 'Conference registration fee', amount: 850.00, date: new Date(currentYear, 3, 10), merchant: 'TechConf 2026' }
    })
    console.log('  Created 2 expense reports, 4 items')
  }

  // =============================================
  // 21. Seed Announcements
  // =============================================
  console.log('Creating announcements...')

  const existingAnnouncements = await prisma.announcement.count()
  if (existingAnnouncements === 0) {
    await prisma.announcement.create({
      data: {
        title: 'Welcome to Q1 2026!',
        content: 'Excited to kick off Q1 with new initiatives. Review updated goals and OKRs. Town hall on Jan 15th.',
        authorId: adminUser.id,
        type: 'news',
        priority: 'high',
        status: 'published',
        publishedAt: new Date(currentYear, 0, 2)
      }
    })

    await prisma.announcement.create({
      data: {
        title: 'Updated Remote Work Policy',
        content: 'Remote work policy updated Feb 1st. Up to 3 remote days per week. See HR Documents for details.',
        authorId: hrUser.id,
        type: 'policy',
        priority: 'normal',
        status: 'published',
        publishedAt: new Date(currentYear, 0, 25)
      }
    })

    await prisma.announcement.create({
      data: {
        title: 'System Maintenance Scheduled',
        content: 'HRMS maintenance on March 15th, 10 PM - 2 AM EST. System may be unavailable. Save your work.',
        authorId: adminUser.id,
        type: 'alert',
        priority: 'high',
        status: 'published',
        publishedAt: new Date(currentYear, 2, 10)
      }
    })
    console.log('  Created 3 announcements')
  }

  // =============================================
  // 22. Seed Survey & Responses
  // =============================================
  console.log('Creating surveys...')

  const existingSurveys = await prisma.survey.count()
  if (existingSurveys === 0) {
    const survey = await prisma.survey.create({
      data: {
        title: 'Q1 2026 Employee Engagement Survey',
        description: 'Help us understand your experience and satisfaction at work',
        type: 'engagement',
        targetAudience: ['employee', 'manager'],
        questions: [
          { id: 1, text: 'How satisfied are you with your current role?', type: 'rating', scale: 5 },
          { id: 2, text: 'How well does your manager support your growth?', type: 'rating', scale: 5 },
          { id: 3, text: 'Would you recommend this company as a great place to work?', type: 'rating', scale: 10 },
          { id: 4, text: 'What could we improve?', type: 'text' },
          { id: 5, text: 'How satisfied are you with work-life balance?', type: 'rating', scale: 5 }
        ],
        startDate: new Date(currentYear, 2, 1),
        endDate: new Date(currentYear, 2, 31),
        status: 'active',
        isAnonymous: true
      }
    })

    await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        answers: [
          { questionId: 1, value: 4 },
          { questionId: 2, value: 5 },
          { questionId: 3, value: 8 },
          { questionId: 4, value: 'More team building activities would be great' },
          { questionId: 5, value: 4 }
        ]
      }
    })

    await prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        answers: [
          { questionId: 1, value: 5 },
          { questionId: 2, value: 4 },
          { questionId: 3, value: 9 },
          { questionId: 4, value: 'Better meeting room availability' },
          { questionId: 5, value: 3 }
        ]
      }
    })
    console.log('  Created 1 survey, 2 responses')
  }

  // =============================================
  // 23. Seed Compliance Requirements & Records
  // =============================================
  console.log('Creating compliance data...')

  const existingCompliance = await prisma.complianceRequirement.count()
  if (existingCompliance === 0) {
    const req1 = await prisma.complianceRequirement.create({
      data: {
        name: 'Annual Data Privacy Training',
        description: 'All employees must complete annual GDPR and data privacy training',
        dueDate: new Date(currentYear, 2, 31),
        frequency: 'annually',
        status: 'active'
      }
    })

    const req2 = await prisma.complianceRequirement.create({
      data: {
        name: 'Workplace Safety Certification',
        description: 'OSHA workplace safety certification renewal',
        dueDate: new Date(currentYear, 5, 30),
        frequency: 'annually',
        status: 'active'
      }
    })

    // Employee compliance records
    const complianceRecords = [
      { employeeId: employee.id, requirementId: req1.id, status: 'compliant', completedAt: new Date(currentYear, 1, 15) },
      { employeeId: managerEmployee.id, requirementId: req1.id, status: 'compliant', completedAt: new Date(currentYear, 1, 20) },
      { employeeId: hrEmployee.id, requirementId: req1.id, status: 'pending', completedAt: null },
      { employeeId: employee.id, requirementId: req2.id, status: 'pending', completedAt: null }
    ]

    for (const rec of complianceRecords) {
      await prisma.employeeCompliance.create({
        data: {
          ...rec,
          expiresAt: new Date(currentYear + 1, 2, 31)
        }
      })
    }
    console.log('  Created 2 requirements, 4 compliance records')
  }

  // =============================================
  // 24. Seed Wellness Programs & Enrollments
  // =============================================
  console.log('Creating wellness programs...')

  const existingWellness = await prisma.wellnessProgram.count()
  if (existingWellness === 0) {
    const prog1 = await prisma.wellnessProgram.create({
      data: {
        name: 'Step Challenge 2026',
        description: 'Company-wide 10,000 steps daily challenge. Track your steps and earn wellness points!',
        startDate: new Date(currentYear, 0, 15),
        endDate: new Date(currentYear, 3, 15),
        isActive: true
      }
    })

    const prog2 = await prisma.wellnessProgram.create({
      data: {
        name: 'Mindfulness & Meditation',
        description: 'Weekly guided meditation sessions and stress management workshops',
        startDate: new Date(currentYear, 1, 1),
        isActive: true
      }
    })

    await prisma.wellnessEnrollment.create({
      data: { employeeId: employee.id, programId: prog1.id, enrolledAt: new Date(currentYear, 0, 16), points: 450, status: 'active' }
    })
    await prisma.wellnessEnrollment.create({
      data: { employeeId: managerEmployee.id, programId: prog1.id, enrolledAt: new Date(currentYear, 0, 17), points: 320, status: 'active' }
    })
    await prisma.wellnessEnrollment.create({
      data: { employeeId: hrEmployee.id, programId: prog2.id, enrolledAt: new Date(currentYear, 1, 3), points: 100, status: 'active' }
    })
    console.log('  Created 2 programs, 3 enrollments')
  }

  // =============================================
  // 25. Seed System Settings
  // =============================================
  console.log('Creating system settings...')

  const settingsData = [
    { key: 'company.name', category: 'general', value: 'Acme Corporation', description: 'Company display name', isPublic: true },
    { key: 'company.timezone', category: 'general', value: 'America/New_York', description: 'Default company timezone', isPublic: true },
    { key: 'leave.approval_required', category: 'leave', value: true, description: 'Whether leave requests require manager approval', isPublic: false },
    { key: 'payroll.pay_frequency', category: 'payroll', value: 'monthly', description: 'Default pay frequency', isPublic: false },
    { key: 'security.password_min_length', category: 'security', value: 8, description: 'Minimum password length', isPublic: false }
  ]

  for (const setting of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        category: setting.category,
        value: setting.value as any,
        description: setting.description,
        isPublic: setting.isPublic
      }
    })
  }
  console.log('  Created 5 system settings')

  // =============================================
  // DONE
  // =============================================
  console.log('\n=========================================')
  console.log('Database seeding completed successfully!')
  console.log('=========================================')
  console.log('\nDefault users created:')
  console.log('  Admin:      admin@hrms.com / Admin123!')
  console.log('  HR Manager: hr@hrms.com / HRManager123!')
  console.log('  Manager:    manager@hrms.com / Manager123!')
  console.log('  Employee:   employee@hrms.com / Employee123!')
  console.log('\nSeeded modules:')
  console.log('  ✔ Permissions & Roles')
  console.log('  ✔ Users & Employees')
  console.log('  ✔ Departments (with hierarchy)')
  console.log('  ✔ Teams & Members')
  console.log('  ✔ Time Entries')
  console.log('  ✔ Leave Types, Balances & Requests')
  console.log('  ✔ Performance Reviews')
  console.log('  ✔ Benefit Plans & Enrollments')
  console.log('  ✔ Training Courses & Records')
  console.log('  ✔ Payroll Entries')
  console.log('  ✔ Job Postings, Applications & Interviews')
  console.log('  ✔ Onboarding Checklist')
  console.log('  ✔ Documents')
  console.log('  ✔ Goals (cascading)')
  console.log('  ✔ Projects & Tasks')
  console.log('  ✔ Schedules & Shifts')
  console.log('  ✔ Expense Reports & Items')
  console.log('  ✔ Announcements')
  console.log('  ✔ Surveys & Responses')
  console.log('  ✔ Compliance Requirements & Records')
  console.log('  ✔ Wellness Programs & Enrollments')
  console.log('  ✔ System Settings')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })