import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  TimeAttendanceController,
  LeaveController,
  PayrollController,
  PerformanceController,
  BenefitsController,
  LearningController,
  RecruitmentController,
  OnboardingController,
  ComplianceController,
  WellnessController
} from '../controllers/HRModulesController'

const router = Router()

// Initialize controllers
const timeController = new TimeAttendanceController()
const leaveController = new LeaveController()
const payrollController = new PayrollController()
const performanceController = new PerformanceController()
const benefitsController = new BenefitsController()
const learningController = new LearningController()
const recruitmentController = new RecruitmentController()
const onboardingController = new OnboardingController()
const complianceController = new ComplianceController()
const wellnessController = new WellnessController()

// ============ Time and Attendance Routes ============
router.post('/time/clock-in', authenticate, timeController.clockIn.bind(timeController))
router.post('/time/clock-out', authenticate, timeController.clockOut.bind(timeController))
router.get('/time/timesheet', authenticate, timeController.getTimesheet.bind(timeController))
router.post('/time/timesheet/:timesheetId/approve', authenticate, authorize('APPROVE', 'TIMESHEET'), timeController.approveTimesheet.bind(timeController))

// ============ Leave Management Routes ============
router.get('/leave/balance', authenticate, leaveController.getLeaveBalance.bind(leaveController))
router.get('/leave/types', authenticate, leaveController.getLeaveTypes.bind(leaveController))
router.get('/leave/requests', authenticate, leaveController.getLeaveRequests.bind(leaveController))
router.post('/leave/requests', authenticate, leaveController.submitLeaveRequest.bind(leaveController))
router.post('/leave/requests/:requestId/approve', authenticate, authorize('APPROVE', 'LEAVE'), leaveController.approveLeaveRequest.bind(leaveController))
router.post('/leave/requests/:requestId/reject', authenticate, authorize('APPROVE', 'LEAVE'), leaveController.rejectLeaveRequest.bind(leaveController))

// ============ Payroll Routes ============
router.get('/payroll/pay-stub', authenticate, payrollController.getPayStub.bind(payrollController))
router.post('/payroll/process', authenticate, authorize('PROCESS', 'PAYROLL'), payrollController.processPayroll.bind(payrollController))
router.get('/payroll/history', authenticate, payrollController.getPayrollHistory.bind(payrollController))

// ============ Performance Management Routes ============
router.post('/performance/reviews', authenticate, performanceController.createReview.bind(performanceController))
router.post('/performance/reviews/:reviewId/submit', authenticate, performanceController.submitReview.bind(performanceController))
router.post('/performance/reviews/:reviewId/approve', authenticate, authorize('APPROVE', 'PERFORMANCE'), performanceController.approveReview.bind(performanceController))
router.get('/performance/history', authenticate, performanceController.getPerformanceHistory.bind(performanceController))

// ============ Benefits Administration Routes ============
router.post('/benefits/enroll', authenticate, benefitsController.enrollBenefit.bind(benefitsController))
router.get('/benefits', authenticate, benefitsController.getEmployeeBenefits.bind(benefitsController))
router.put('/benefits/enrollments/:enrollmentId', authenticate, benefitsController.updateBenefitEnrollment.bind(benefitsController))

// ============ Learning and Development Routes ============
router.post('/learning/courses/enroll', authenticate, learningController.enrollCourse.bind(learningController))
router.post('/learning/training/:recordId/complete', authenticate, learningController.completeTraining.bind(learningController))
router.get('/learning/history', authenticate, learningController.getTrainingHistory.bind(learningController))
router.get('/learning/compliance', learningController.getComplianceTraining.bind(learningController))

// ============ Recruitment Routes ============
router.post('/recruitment/job-postings', authenticate, authorize('CREATE', 'JOB_POSTING'), recruitmentController.createJobPosting.bind(recruitmentController))
router.post('/recruitment/job-postings/:postingId/publish', authenticate, authorize('PUBLISH', 'JOB_POSTING'), recruitmentController.publishJobPosting.bind(recruitmentController))
router.post('/recruitment/applications', recruitmentController.submitApplication.bind(recruitmentController))
router.post('/recruitment/interviews', authenticate, authorize('CREATE', 'INTERVIEW'), recruitmentController.scheduleInterview.bind(recruitmentController))
router.put('/recruitment/applications/:applicationId/status', authenticate, authorize('UPDATE', 'APPLICATION'), recruitmentController.updateApplicationStatus.bind(recruitmentController))
router.get('/recruitment/job-postings/:jobPostingId/pipeline', authenticate, recruitmentController.getHiringPipeline.bind(recruitmentController))

// ============ Onboarding Routes ============
router.post('/onboarding/checklists', authenticate, authorize('CREATE', 'ONBOARDING'), onboardingController.createOnboardingChecklist.bind(onboardingController))
router.post('/onboarding/checklists/:checklistId/tasks', authenticate, onboardingController.completeOnboardingTask.bind(onboardingController))

// ============ Compliance Management Routes ============
router.post('/compliance/requirements', authenticate, authorize('CREATE', 'COMPLIANCE'), complianceController.createRequirement.bind(complianceController))
router.get('/compliance/upcoming-requirements', authenticate, complianceController.getUpcomingRequirements.bind(complianceController))
router.post('/compliance/requirements/:requirementId/complete', authenticate, authorize('UPDATE', 'COMPLIANCE'), complianceController.markComplete.bind(complianceController))

// ============ Wellness Program Routes ============
router.post('/wellness/enroll', authenticate, wellnessController.enrollProgram.bind(wellnessController))
router.post('/wellness/enrollments/:enrollmentId/points', authenticate, authorize('AWARD', 'WELLNESS'), wellnessController.awardPoints.bind(wellnessController))
router.get('/wellness/status', authenticate, wellnessController.getWellnessStatus.bind(wellnessController))

export default router
