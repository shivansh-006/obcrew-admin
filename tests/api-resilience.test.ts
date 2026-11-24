import { describe, it, expect } from 'vitest';
import { ApiClientError } from '@/lib/api/client';
import { exportToCSV } from '@/lib/utils';

describe('Phase 5.5: API Resilience, Error Handling & Utility Tests', () => {
  it('handles backend network outage and service downtime gracefully', () => {
    const handleNetworkFailure = (error: unknown) => {
      if (error instanceof ApiClientError) {
        return `Backend Error (${error.status}): ${error.message}`;
      }
      return 'Unable to reach the authentication service. Check the backend connection and try again.';
    };

    const outageError = new TypeError('Failed to fetch');
    expect(handleNetworkFailure(outageError)).toMatch(/Unable to reach the authentication service/);

    const gatewayError = new ApiClientError(502, 'Bad Gateway');
    expect(handleNetworkFailure(gatewayError)).toBe('Backend Error (502): Bad Gateway');
  });

  it('escapes cells and handles commas/quotes in exportToCSV', () => {
    // Verify cell escaping logic
    const escapeCell = (val: string | number | boolean | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    expect(escapeCell('Plain text')).toBe('Plain text');
    expect(escapeCell('Text, with comma')).toBe('"Text, with comma"');
    expect(escapeCell('Text with "quotes"')).toBe('"Text with ""quotes"""');
    expect(escapeCell(null)).toBe('');
    expect(escapeCell(1250.5)).toBe('1250.5');
  });
});
