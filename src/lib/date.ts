export function formatDisplayDate(value?: string | Date | null) {
  if (!value) return '아직 없음';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '알 수 없음';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
