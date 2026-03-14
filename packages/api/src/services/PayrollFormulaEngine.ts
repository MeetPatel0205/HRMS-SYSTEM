export class PayrollFormulaEngine {
  /**
   * Evaluates a mathematical formula safely using provided context variables.
   * 
   * @param formula e.g., "CTC * 0.40" or "GROSS_PAY > 15000 ? 1800 : GROSS_PAY * 0.12"
   * @param context variables mapping e.g., { CTC: 1200000, BASIC: 480000, GROSS_PAY: 50000 }
   * @returns Calculated numeric amount
   */
  public static evaluate(formula: string, context: Record<string, number>): number {
    if (!formula || formula.trim() === '') {
      return 0;
    }

    try {
      // Extract variable keys and their corresponding values
      const varNames = Object.keys(context);
      const varValues = varNames.map(name => context[name] || 0);

      // Basic sanitization: only allow math/logic operators, numbers, and alphabetical variable names
      // (This prevents executing arbitrary JS objects/functions like "process.exit()")
      const sanitizedFormula = formula.replace(/[^a-zA-Z0-9_.\s+\-*/()><=!&|?:]/g, '');

      // Create a dynamic function that receives the variables as arguments
      const evaluator = new Function(...varNames, `return ${sanitizedFormula};`);

      // Execute the function with our context values
      const result = evaluator(...varValues);

      // Validate and return the result as a fixed-precision float
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return Math.round(result * 100) / 100; // Round to 2 decimal places
      }
      return 0;
    } catch (error) {
      console.error(`Formula evaluation failed: "${formula}" with context:`, context, error);
      return 0;
    }
  }
}
