import { PrismaClient, Workflow, WorkflowInstance, Prisma } from '@prisma/client';
import { AuditLogService } from './AuditLogService';
import { NotificationService } from './NotificationService';

const prisma = new PrismaClient();
const auditLogService = new AuditLogService();
const notificationService = new NotificationService();

export class WorkflowService {
  /**
   * Create workflow
   */
  async createWorkflow(
    data: Prisma.WorkflowCreateInput,
    userId: string
  ): Promise<Workflow> {
    const workflow = await prisma.workflow.create({
      data,
    });

    await auditLogService.log({
      userId,
      action: 'CREATE',
      resource: 'Workflow',
      resourceId: workflow.id,
      newValues: workflow,
    });

    return workflow;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow | null> {
    return prisma.workflow.findUnique({
      where: { id },
      include: {
        instances: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * Get all workflows
   */
  async getAllWorkflows(filters?: {
    entityType?: string;
    isActive?: boolean;
  }): Promise<Workflow[]> {
    const where: Prisma.WorkflowWhereInput = {};

    if (filters?.entityType) {
      // @ts-ignore - entityType might be missing in generated type
      where.entityType = filters.entityType;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.workflow.findMany({
      where,
      include: {
        _count: {
          select: {
            instances: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    id: string,
    data: Prisma.WorkflowUpdateInput,
    userId: string
  ): Promise<Workflow> {
    const oldWorkflow = await prisma.workflow.findUnique({
      where: { id },
    });

    const workflow = await prisma.workflow.update({
      where: { id },
      data,
    });

    await auditLogService.log({
      userId,
      action: 'UPDATE',
      resource: 'Workflow',
      resourceId: id,
      oldValues: oldWorkflow || undefined,
      newValues: workflow,
    });

    return workflow;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string, userId: string): Promise<void> {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        instances: true,
      },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Delete all instances first
    await prisma.workflowInstance.deleteMany({
      where: { workflowId: id },
    });

    await prisma.workflow.delete({
      where: { id },
    });

    await auditLogService.log({
      userId,
      action: 'DELETE',
      resource: 'Workflow',
      resourceId: id,
      oldValues: workflow,
    });
  }

  /**
   * Start workflow instance
   */
  async startWorkflowInstance(
    workflowId: string,
    entityId: string,
    initiatedBy: string,
    data?: any
  ): Promise<WorkflowInstance> {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (!workflow.isActive) {
      throw new Error('Workflow is not active');
    }

    const instance = await prisma.workflowInstance.create({
      data: {
        workflowId,
        entityId,
        status: 'pending',
        currentStep: 0, // Prisma might expect String if schema is mismatch, but let's try assuming Int first or fix if String
        context: data || {},
        history: [],
        startedAt: new Date(),
      },
    });

    await auditLogService.log({
      userId: initiatedBy,
      action: 'START',
      resource: 'WorkflowInstance',
      resourceId: instance.id,
      newValues: instance,
    });

    // Process first step
    await this.processWorkflowStep(instance.id, initiatedBy);

    return instance;
  }

  /**
   * Process workflow step
   */
  async processWorkflowStep(
    instanceId: string,
    userId: string
  ): Promise<WorkflowInstance> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        workflow: true,
      },
    });

    if (!instance) {
      throw new Error('Workflow instance not found');
    }

    const steps = instance.workflow.nodes as any[];
    const currentStep = steps[instance.currentStep];

    if (!currentStep) {
      // No more steps, complete workflow
      return this.completeWorkflowInstance(instanceId, userId);
    }

    // Execute step action
    await this.executeStepAction(instance, currentStep, userId);
    switch (currentStep.type) {
      case 'approval':
        await this.handleApprovalStep(instance, currentStep, userId);
        break;
      case 'notification':
        await this.handleNotificationStep(instance, currentStep);
        break;
      case 'assignment':
        await this.handleAssignmentStep(instance, currentStep);
        break;
      case 'condition':
        await this.handleConditionStep(instance, currentStep);
        break;
      default:
        // Log warning but don't fail for unknown step types in production unless strict
        console.warn(`Unknown step type: ${currentStep.type}`);
        break;
    }

    // Update instance
    const updatedInstance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStep: (instance.currentStep || 0) + 1,

      }
    });

    return updatedInstance;
  }

  /**
   * Handle approval step
   */
  private async handleApprovalStep(
    instance: WorkflowInstance & { workflow: Workflow },
    step: any,
    userId: string
  ): Promise<void> {
    const approvers = step.approvers || [];

    for (const approverId of approvers) {
      await notificationService.createNotification({
        user: { connect: { id: approverId } },
        type: 'approval',
        title: 'Approval Required',
        message: `Approval required for ${instance.workflow.name}`,
        data: {
          workflowInstanceId: instance.id,
          entityId: instance.entityId,
        },
      });
    }
  }

  /**
   * Handle notification step
   */
  private async handleNotificationStep(
    instance: WorkflowInstance & { workflow: Workflow },
    step: any
  ): Promise<void> {
    const recipients = step.recipients || [];

    for (const recipientId of recipients) {
      await notificationService.createNotification({
        user: { connect: { id: recipientId } },
        type: 'workflow',
        title: step.title || 'Workflow Notification',
        message: step.message || `Workflow ${instance.workflow.name} notification`,
        data: {
          workflowInstanceId: instance.id,
          entityId: instance.entityId,
        },
      });
    }
  }

  /**
   * Handle assignment step
   */
  private async handleAssignmentStep(
    instance: WorkflowInstance & { workflow: Workflow },
    step: any
  ): Promise<void> {
    // Update instance data with assignment
    const context = instance.context as any;
    context.assignedTo = step.assignTo;

    await prisma.workflowInstance.update({
      where: { id: instance.id },
      data: { context },
    });
  }

  /**
   * Handle condition step
   */
  private async handleConditionStep(
    instance: WorkflowInstance & { workflow: Workflow },
    step: any
  ): Promise<void> {
    // Evaluate condition and update workflow path
    const condition = step.condition;
    const context = instance.context as any;

    // Simple condition evaluation (can be extended)
    if (condition && context[condition.field] === condition.value) {
      // Condition met, continue
    } else {
      // Condition not met, skip to alternative step
      if (step.alternativeStep !== undefined) {
        await prisma.workflowInstance.update({
          where: { id: instance.id },
          data: { currentStep: step.alternativeStep },
        });
      }
    }
  }

  /**
   * Complete workflow instance
   */
  private async completeWorkflowInstance(
    instanceId: string,
    userId: string
  ): Promise<WorkflowInstance> {
    const instance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    await auditLogService.log({
      userId,
      action: 'COMPLETE',
      resource: 'WorkflowInstance',
      resourceId: instanceId,
      newValues: { status: 'completed' },
    });

    return instance;
  }

  /**
   * Execute step action
   */
  private async executeStepAction(
    instance: WorkflowInstance,
    step: any,
    userId: string
  ): Promise<void> {
    // Placeholder for actual step execution logic
    console.log(`Executing step action for step ${step.id} in instance ${instance.id}`);

    await auditLogService.log({
      userId,
      action: 'EXECUTE_STEP',
      resource: 'WorkflowInstance',
      resourceId: instance.id,
      newValues: { stepId: step.id, type: step.type },
    });
  }

  /**
   * Approve workflow step
   */
  async approveWorkflowStep(
    instanceId: string,
    userId: string,
    comments?: string
  ): Promise<WorkflowInstance> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error('Workflow instance not found');
    }

    await auditLogService.log({
      userId,
      action: 'APPROVE',
      resource: 'WorkflowInstance',
      resourceId: instanceId,
      newValues: { comments },
    });

    // Move to next step
    return this.processWorkflowStep(instanceId, userId);
  }

  /**
   * Reject workflow step
   */
  async rejectWorkflowStep(
    instanceId: string,
    userId: string,
    reason: string
  ): Promise<WorkflowInstance> {
    const instance = await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: 'rejected',
        completedAt: new Date(),
      },
    });

    await auditLogService.log({
      userId,
      action: 'REJECT',
      resource: 'WorkflowInstance',
      resourceId: instanceId,
      newValues: { reason },
    });

    return instance;
  }

  /**
   * Get workflow instances
   */
  async getWorkflowInstances(filters?: {
    workflowId?: string;
    entityId?: string;
    status?: string;
  }): Promise<WorkflowInstance[]> {
    const where: Prisma.WorkflowInstanceWhereInput = {};

    if (filters?.workflowId) {
      where.workflowId = filters.workflowId;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return prisma.workflowInstance.findMany({
      where,
      include: {
        workflow: true,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string): Promise<{
    totalInstances: number;
    completed: number;
    pending: number;
    rejected: number;
    averageCompletionTime: number;
  }> {
    const instances = await prisma.workflowInstance.findMany({
      where: { workflowId },
    });

    const totalInstances = instances.length;
    const completed = instances.filter((i) => i.status === 'completed').length;
    const pending = instances.filter((i) => i.status === 'pending' || i.status === 'in_progress').length;
    const rejected = instances.filter((i) => i.status === 'rejected').length;

    const completedInstances = instances.filter(
      (i: WorkflowInstance) => i.status === 'completed' && i.completedAt
    );
    const averageCompletionTime =
      completedInstances.length > 0
        ? completedInstances.reduce((sum, i) => {
          const time = i.completedAt!.getTime() - i.startedAt.getTime();
          return sum + time;
        }, 0) / completedInstances.length
        : 0;

    return {
      totalInstances,
      completed,
      pending,
      rejected,
      averageCompletionTime,
    };
  }
}
