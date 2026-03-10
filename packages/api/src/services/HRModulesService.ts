import { prisma } from '../utils/database'
import { logger } from '../utils/logger'
import { ValidationError, NotFoundError } from '../middleware/errorHandler'

/**
 * Time and Attendance Service
 * Properties: 11, 12, 13, 14
 */
export class TimeAttendanceService {
  async clockIn(employeeId: string, location?: any): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })
    if (!employee) throw new NotFoundError('Employee not found')

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId,
        date: { gte: today }
      }
    })

    if (existingEntry && !existingEntry.clockOut) {
      throw new ValidationError('Already clocked in for today')
    }

    return prisma.timeEntry.create({
      data: {
        employeeId,
        date: new Date(),
        clockIn: new Date(),
        location,
        status: 'pending',
        breaks: []
      }
    })
  }

  async clockOut(employeeId: string): Promise<any> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const timeEntry = await prisma.timeEntry.findFirst({
      where: {
        employeeId,
        date: { gte: today },
        clockOut: null
      }
    })

    if (!timeEntry) {
      throw new NotFoundError('No active clock in found')
    }

    const clockOut = new Date()
    const totalMinutes = (clockOut.getTime() - timeEntry.clockIn.getTime()) / (1000 * 60)
    const totalHours = totalMinutes / 60

    return prisma.timeEntry.update({
      where: { id: timeEntry.id },
      data: {
        clockOut,
        totalHours: parseFloat(totalHours.toFixed(2)),
        regularHours: Math.min(totalHours, 8),
        overtimeHours: Math.max(0, totalHours - 8)
      }
    })
  }

  async getTimesheetPeriod(employeeId: string, startDate: Date, endDate: Date): Promise<any[]> {
    return prisma.timeEntry.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    })
  }

  async approveTimesheet(timesheetId: string, approverId: string): Promise<any> {
    return prisma.timeEntry.update({
      where: { id: timesheetId },
      data: {
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date()
      }
    })
  }
}

/**
 * Leave Management Service
 * Properties: 6, 7, 12
 */
export class LeaveService {
  async getLeaveBalance(employeeId: string, leaveTypeId?: string): Promise<any> {
    const whereClause: any = { employeeId, status: 'approved' }
    if (leaveTypeId) whereClause.leaveTypeId = leaveTypeId

    const approvedRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: { leaveType: true }
    })

    const balance: Record<string, number> = {}

    for (const request of approvedRequests) {
      const type = request.leaveType.name
      balance[type] = (balance[type] || 0) + request.totalDays
    }

    return balance
  }

  async submitLeaveRequest(request: {
    employeeId: string
    leaveTypeId: string
    startDate: Date
    endDate: Date
    reason?: string
  }, submittedBy: string): Promise<any> {
    const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

    return prisma.leaveRequest.create({
      data: {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        startDate: request.startDate,
        endDate: request.endDate,
        totalDays: days,
        reason: request.reason,
        status: 'pending',
        submittedAt: new Date(),
        approvalWorkflow: [
          {
            step: 1,
            approverRole: 'manager',
            status: 'pending',
            timestamp: new Date()
          }
        ],
        attachments: []
      }
    })
  }

  async approveLeaveRequest(requestId: string, approverId: string): Promise<any> {
    return prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved'
      }
    })
  }

  async rejectLeaveRequest(requestId: string, approverId: string, reason: string): Promise<any> {
    return prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected'
      }
    })
  }
}

/**
 * Payroll Service
 * Properties: 13, 15, 16, 18
 */
export class PayrollService {
  async calculatePayroll(employeeId: string, payPeriodStart: Date, payPeriodEnd: Date): Promise<any> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })
    if (!employee) throw new NotFoundError('Employee not found')

    const salaryInfo = employee.salaryInfo as any

    // Get time entries for period
    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        employeeId,
        date: { gte: payPeriodStart, lte: payPeriodEnd },
        status: 'approved'
      }
    })

    // Calculate total hours
    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.totalHours, 0)
    const overtimeHours = timeEntries.reduce((sum, entry) => sum + entry.overtimeHours, 0)

    // Calculate gross pay
    const regularPay = salaryInfo.hourlyRate * (totalHours - overtimeHours)
    const overtimePay = salaryInfo.hourlyRate * 1.5 * overtimeHours
    const grossPay = regularPay + overtimePay

    // Calculate taxes (simplified)
    const taxWithholding = grossPay * 0.25 // 25% tax
    const socialSecurity = grossPay * 0.062
    const medicare = grossPay * 0.0145

    // Calculate deductions
    const deductions = {
      federalTax: taxWithholding,
      socialSecurity,
      medicare,
      benefits: salaryInfo.benefitDeductions || 0
    }

    const totalDeductions = Object.values(deductions).reduce((a: any, b: any) => a + b, 0)
    const netPay = grossPay - totalDeductions

    return {
      employeeId,
      payPeriodStart,
      payPeriodEnd,
      grossPay: parseFloat(grossPay.toFixed(2)),
      deductions,
      taxWithholding: parseFloat(taxWithholding.toFixed(2)),
      netPay: parseFloat(netPay.toFixed(2)),
      totalHours,
      overtimeHours
    }
  }

  async processPayroll(payPeriodStart: Date, payPeriodEnd: Date): Promise<any> {
    const employees = await prisma.employee.findMany({
      where: { status: 'active' }
    })

    const results = []
    for (const employee of employees) {
      const calculation = await this.calculatePayroll(employee.id, payPeriodStart, payPeriodEnd)

      const entry = await prisma.payrollEntry.create({
        data: {
          employeeId: employee.id,
          payPeriodStart,
          payPeriodEnd,
          grossPay: calculation.grossPay,
          taxWithholding: calculation.taxWithholding,
          deductions: calculation.deductions,
          netPay: calculation.netPay,
          status: 'processed'
        }
      })

      results.push(entry)
    }

    return results
  }

  async getPayrollHistory(employeeId: string, skip: number = 0, take: number = 12): Promise<any> {
    return prisma.payrollEntry.findMany({
      where: { employeeId },
      skip,
      take,
      orderBy: { payPeriodStart: 'desc' }
    })
  }
}

/**
 * Performance Management Service
 * Properties: 19, 20, 21
 */
export class PerformanceService {
  async createPerformanceReview(request: {
    employeeId: string
    reviewerId: string
    reviewPeriodStart: Date
    reviewPeriodEnd: Date
    reviewType: string
  }): Promise<any> {
    return prisma.performanceReview.create({
      data: {
        employeeId: request.employeeId,
        reviewerId: request.reviewerId,
        reviewPeriodStart: request.reviewPeriodStart,
        reviewPeriodEnd: request.reviewPeriodEnd,
        reviewType: request.reviewType,
        status: 'draft',
        goals: [],
        competencies: [],
        peerFeedback: [],
        feedback: {
          strengths: '',
          areasForImprovement: '',
          developmentPlan: ''
        }
      }
    })
  }

  async submitPerformanceReview(reviewId: string, feedback: any): Promise<any> {
    return prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: 'submitted',
        feedback,
        submittedAt: new Date()
      }
    })
  }

  async approvePerformanceReview(reviewId: string, rating: number): Promise<any> {
    return prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: 'approved',
        overallRating: rating,
        approvedAt: new Date()
      }
    })
  }

  async getEmployeePerformanceHistory(employeeId: string): Promise<any> {
    return prisma.performanceReview.findMany({
      where: { employeeId, status: 'approved' },
      orderBy: { reviewPeriodStart: 'desc' }
    })
  }
}

/**
 * Benefits Administration Service
 * Properties: 22
 */
export class BenefitsService {
  async enrollEmployee(employeeId: string, benefitPlanId: string, elections: any): Promise<any> {
    return prisma.benefitEnrollment.create({
      data: {
        employeeId,
        benefitPlanId,
        enrollmentDate: new Date(),
        effectiveDate: new Date(),
        elections,
        status: 'active'
      }
    })
  }

  async getEmployeeBenefits(employeeId: string): Promise<any> {
    return prisma.benefitEnrollment.findMany({
      where: { employeeId, status: 'active' },
      include: { benefitPlan: true }
    })
  }

  async updateBenefitEnrollment(enrollmentId: string, elections: any): Promise<any> {
    return prisma.benefitEnrollment.update({
      where: { id: enrollmentId },
      data: { elections, updatedAt: new Date() }
    })
  }
}

/**
 * Learning and Development Service
 * Properties: 23, 24, 25
 */
export class LearningService {
  async enrollCourse(employeeId: string, courseId: string): Promise<any> {
    return prisma.trainingRecord.create({
      data: {
        employeeId,
        trainingCourseId: courseId,
        enrollmentDate: new Date(),
        status: 'enrolled'
      }
    })
  }

  async completeTraining(recordId: string, score?: number, certificateUrl?: string): Promise<any> {
    return prisma.trainingRecord.update({
      where: { id: recordId },
      data: {
        status: 'completed',
        completionDate: new Date(),
        score,
        certificateUrl
      }
    })
  }

  async getEmployeeTrainingHistory(employeeId: string): Promise<any> {
    return prisma.trainingRecord.findMany({
      where: { employeeId },
      include: { trainingCourse: true },
      orderBy: { completionDate: 'desc' }
    })
  }

  async getComplianceTraining(courseType: string): Promise<any> {
    return prisma.trainingCourse.findMany({
      where: { type: courseType, isActive: true }
    })
  }
}

/**
 * Recruitment Service
 * Properties: 6, 7, 8
 */
export class RecruitmentService {
  async createJobPosting(data: any): Promise<any> {
    return prisma.jobPosting.create({ data })
  }

  async publishJobPosting(postingId: string): Promise<any> {
    return prisma.jobPosting.update({
      where: { id: postingId },
      data: { status: 'published', publishedAt: new Date() }
    })
  }

  async submitApplication(data: any): Promise<any> {
    return prisma.application.create({ data })
  }

  async scheduleInterview(data: any): Promise<any> {
    return prisma.interview.create({ data })
  }

  async updateApplicationStatus(applicationId: string, status: string): Promise<any> {
    return prisma.application.update({
      where: { id: applicationId },
      data: { status, updatedAt: new Date() }
    })
  }

  async getHiringPipeline(jobPostingId: string): Promise<any> {
    const applications = await prisma.application.findMany({
      where: { jobPostingId },
      include: { interviews: true },
      orderBy: { submittedAt: 'desc' }
    })

    return {
      jobPostingId,
      submitted: applications.filter(a => a.status === 'submitted').length,
      reviewed: applications.filter(a => a.status === 'reviewed').length,
      interviewed: applications.filter(a => a.status === 'interviewed').length,
      offered: applications.filter(a => a.status === 'offered').length,
      hired: applications.filter(a => a.status === 'hired').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      applications
    }
  }
}

/**
 * Onboarding Service
 * Properties: 9, 10
 */
export class OnboardingService {
  async createOnboardingChecklist(employeeId: string): Promise<any> {
    const tasks = [
      { title: 'Complete I-9 verification', completed: false, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      { title: 'Sign employment agreement', completed: false, dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
      { title: 'Complete orientation', completed: false, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      { title: 'Set up benefits enrollment', completed: false, dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      { title: 'Complete compliance training', completed: false, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) }
    ]

    return prisma.onboardingChecklist.create({
      data: {
        employeeId,
        tasks,
        status: 'in_progress',
        startDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    })
  }

  async completeOnboardingTask(checklistId: string, taskIndex: number): Promise<any> {
    const checklist = await prisma.onboardingChecklist.findUnique({
      where: { id: checklistId }
    })
    if (!checklist) throw new NotFoundError('Checklist not found')

    const tasks = checklist.tasks as any[]
    if (taskIndex < 0 || taskIndex >= tasks.length) {
      throw new ValidationError('Invalid task index')
    }

    tasks[taskIndex].completed = true

    const allCompleted = tasks.every((t: any) => t.completed)

    return prisma.onboardingChecklist.update({
      where: { id: checklistId },
      data: {
        tasks,
        status: allCompleted ? 'completed' : 'in_progress',
        completedAt: allCompleted ? new Date() : null
      }
    })
  }
}

/**
 * Compliance Management Service
 * Properties: 40, 41
 */
export class ComplianceService {
  async createComplianceRequirement(data: any): Promise<any> {
    return prisma.complianceRequirement.create({ data })
  }

  async getUpcomingRequirements(daysAhead: number = 30): Promise<any> {
    const today = new Date()
    const futureDate = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    return prisma.complianceRequirement.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: futureDate
        },
        status: 'pending'
      },
      orderBy: { dueDate: 'asc' }
    })
  }

  async markComplianceComplete(requirementId: string): Promise<any> {
    return prisma.complianceRequirement.update({
      where: { id: requirementId },
      data: { status: 'completed' }
    })
  }
}

/**
 * Wellness Program Service
 * Properties: 42
 */
export class WellnessService {
  async enrollWellnessProgram(employeeId: string, programId: string): Promise<any> {
    return prisma.wellnessEnrollment.create({
      data: {
        employeeId,
        programId,
        enrolledAt: new Date(),
        status: 'active',
        points: 0
      }
    })
  }

  async awardWellnessPoints(enrollmentId: string, points: number): Promise<any> {
    const enrollment = await prisma.wellnessEnrollment.findUnique({
      where: { id: enrollmentId }
    })
    if (!enrollment) throw new NotFoundError('Enrollment not found')

    return prisma.wellnessEnrollment.update({
      where: { id: enrollmentId },
      data: {
        points: enrollment.points + points
      }
    })
  }

  async getEmployeeWellnessStatus(employeeId: string): Promise<any> {
    return prisma.wellnessEnrollment.findMany({
      where: { employeeId, status: 'active' },
      include: { program: true }
    })
  }
}
