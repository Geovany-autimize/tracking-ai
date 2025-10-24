import { z } from 'zod';

export type ValidationStatus = 'valid' | 'warning' | 'error';

export interface ValidationResult {
  status: ValidationStatus;
  messages: string[];
}

export interface ProcessedRow<T> {
  data: T;
  validation: ValidationResult;
  rowIndex: number;
}

// Schemas
export const shipmentImportSchema = z.object({
  tracking_code: z.string().min(1, 'Código de rastreio obrigatório'),
  customer_email: z.string().email('Email inválido'),
  status: z.enum(['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed']).default('pending'),
  auto_tracking: z.union([z.string(), z.boolean()]).transform(val => {
    if (typeof val === 'boolean') return val;
    return val.toLowerCase() === 'true' || val === '1';
  }).default(true),
});

export const customerImportSchema = z.object({
  first_name: z.string().min(1, 'Nome obrigatório'),
  last_name: z.string().min(1, 'Sobrenome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type ShipmentImportData = z.infer<typeof shipmentImportSchema>;
export type CustomerImportData = z.infer<typeof customerImportSchema>;

export function validateRow<T>(
  row: any,
  schema: z.ZodTypeAny,
  rowIndex: number
): ProcessedRow<T | null> {
  try {
    const data = schema.parse(row);
    const warnings: string[] = [];
    
    // Check for warnings (non-critical issues)
    if (row.phone && row.phone.length < 10) {
      warnings.push('Telefone pode estar incompleto');
    }
    
    return {
      data,
      validation: {
        status: warnings.length > 0 ? 'warning' : 'valid',
        messages: warnings,
      },
      rowIndex,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        data: null,
        validation: {
          status: 'error',
          messages: error.errors.map(e => e.message),
        },
        rowIndex,
      };
    }
    return {
      data: null,
      validation: {
        status: 'error',
        messages: ['Erro desconhecido ao validar linha'],
      },
      rowIndex,
    };
  }
}

export function processImportData<T>(
  rows: any[],
  mapping: Record<string, string>,
  schema: z.ZodTypeAny
): ProcessedRow<T | null>[] {
  return rows.map((row, index) => {
    // Apply mapping
    const mappedRow: any = {};
    Object.entries(mapping).forEach(([csvColumn, dbField]) => {
      if (row[csvColumn] !== undefined) {
        mappedRow[dbField] = row[csvColumn];
      }
    });
    
    return validateRow(mappedRow, schema, index);
  });
}

export function getValidRows<T>(processedRows: ProcessedRow<T | null>[]): T[] {
  return processedRows
    .filter(row => row.data !== null && row.validation.status !== 'error')
    .map(row => row.data as T);
}

export function getImportSummary<T>(processedRows: ProcessedRow<T | null>[]) {
  const valid = processedRows.filter(r => r.validation.status === 'valid').length;
  const warnings = processedRows.filter(r => r.validation.status === 'warning').length;
  const errors = processedRows.filter(r => r.validation.status === 'error').length;
  
  return { valid, warnings, errors, total: processedRows.length };
}
