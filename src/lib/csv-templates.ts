export interface ShipmentTemplate {
  tracking_code: string;
  customer_email: string;
  status: string;
  auto_tracking: string;
}

export interface CustomerTemplate {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  notes: string;
}

export function generateShipmentTemplate(): string {
  const headers = ['tracking_code', 'customer_email', 'status', 'auto_tracking'];
  const example = ['BR123456789', 'cliente@email.com', 'pending', 'true'];
  
  return [
    headers.join(','),
    example.join(',')
  ].join('\n');
}

export function generateCustomerTemplate(): string {
  const headers = ['first_name', 'last_name', 'email', 'phone', 'notes'];
  const example = ['João', 'Silva', 'joao@email.com', '+5511999999999', 'Cliente VIP'];
  
  return [
    headers.join(','),
    example.join(',')
  ].join('\n');
}

export function downloadTemplate(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
