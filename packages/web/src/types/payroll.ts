export interface SalaryInfo {
    hourlyRate: number;
    currency: string;
    payFrequency: 'weekly' | 'bi-weekly' | 'monthly';
    benefitDeductions?: number;
    taxExemptions?: number;
}

export interface PayrollDeductions {
    federalTax: number;
    socialSecurity: number;
    medicare: number;
    benefits: number;
    [key: string]: number;
}

export interface PayrollBreakdown {
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    regularPay: number;
    overtimePay: number;
}

export interface PayrollEntry {
    id: string;
    employeeId: string;
    payPeriodStart: string; // ISO Date
    payPeriodEnd: string; // ISO Date
    grossPay: number;
    taxWithholding: number;
    deductions: PayrollDeductions;
    netPay: number;
    status: 'pending' | 'processed' | 'paid';
    processedAt?: string;
    breakdown?: PayrollBreakdown; // Optional if not always returned
    employee?: {
        firstName: string;
        lastName: string;
        employeeNumber?: string;
    };
}

export interface PayrollProcessingResult {
    processed: PayrollEntry[];
    errors: {
        employeeId: string;
        name: string;
        error: string;
    }[];
}
