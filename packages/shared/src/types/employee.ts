import { z } from 'zod'

// Enums
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum MaritalStatus {
  SINGLE = 'single',
  MARRIED = 'married',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  SEPARATED = 'separated'
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  TEMPORARY = 'temporary'
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended'
}

// Zod Schemas
export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  country: z.string().default('US')
})

export const EmergencyContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  relationship: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  address: AddressSchema.optional()
})

export const PersonalInfoSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  middleName: z.string().optional(),
  dateOfBirth: z.coerce.date(),
  gender: z.nativeEnum(Gender).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  nationality: z.string().optional(),
  ssn: z.string().optional() // Will be encrypted
})

export const ContactInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  address: AddressSchema,
  emergencyContacts: z.array(EmergencyContactSchema)
})

export const SalaryInfoSchema = z.object({
  baseSalary: z.number().positive(),
  currency: z.string().default('USD'),
  payFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'annually']),
  effectiveDate: z.coerce.date()
})

export const EmploymentInfoSchema = z.object({
  hireDate: z.coerce.date(),
  terminationDate: z.coerce.date().optional(),
  employmentType: z.nativeEnum(EmploymentType),
  status: z.nativeEnum(EmployeeStatus),
  jobTitle: z.string(),
  department: z.string(),
  location: z.string(),
  managerId: z.string().uuid().optional(),
  salaryInfo: SalaryInfoSchema
})

export const AuditInfoSchema = z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  createdBy: z.string().uuid(),
  updatedBy: z.string().uuid()
})

export const EmployeeSchema = z.object({
  id: z.string().uuid(),
  employeeNumber: z.string(),
  personalInfo: PersonalInfoSchema,
  contactInfo: ContactInfoSchema,
  employmentInfo: EmploymentInfoSchema,
  customFields: z.record(z.any()).default({}),
  auditInfo: AuditInfoSchema
})

// TypeScript Types
export type Address = z.infer<typeof AddressSchema>
export type EmergencyContact = z.infer<typeof EmergencyContactSchema>
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>
export type ContactInfo = z.infer<typeof ContactInfoSchema>
export type SalaryInfo = z.infer<typeof SalaryInfoSchema>
export type EmploymentInfo = z.infer<typeof EmploymentInfoSchema>
export type AuditInfo = z.infer<typeof AuditInfoSchema>
export type Employee = z.infer<typeof EmployeeSchema>

// Request/Response Types
export const CreateEmployeeRequestSchema = z.object({
  personalInfo: PersonalInfoSchema,
  contactInfo: ContactInfoSchema,
  employmentInfo: EmploymentInfoSchema.omit({ status: true }).extend({
    status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE)
  }),
  customFields: z.record(z.any()).optional()
})

export const UpdateEmployeeRequestSchema = CreateEmployeeRequestSchema.partial()

export const SearchCriteriaSchema = z.object({
  query: z.string().optional(),
  department: z.string().optional(),
  location: z.string().optional(),
  status: z.nativeEnum(EmployeeStatus).optional(),
  employmentType: z.nativeEnum(EmploymentType).optional(),
  managerId: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20)
})

export type CreateEmployeeRequest = z.infer<typeof CreateEmployeeRequestSchema>
export type UpdateEmployeeRequest = z.infer<typeof UpdateEmployeeRequestSchema>
export type SearchCriteria = z.infer<typeof SearchCriteriaSchema>

export interface SearchResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}