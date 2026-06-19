import { formatDate } from '../formatDate';

describe('formatDate', () => {
  it('should format a valid date string correctly', () => {
    const result = formatDate('2023-10-15T10:30:00Z');
    expect(result).toBe('Oct 15, 2023');
  });

  it('should handle null input gracefully', () => {
    const result = formatDate(null);
    expect(result).toBe('');
  });

  it('should handle undefined input gracefully', () => {
    const result = formatDate(undefined);
    expect(result).toBe('');
  });

  it('should handle invalid date string gracefully', () => {
    const result = formatDate('not-a-date');
    expect(result).toBe('Invalid Date');
  });

  it('should format date with different locale if specified', () => {
    const result = formatDate('2023-10-15T10:30:00Z', 'de-DE');
    expect(result).toBe('15. Okt. 2023');
  });
});