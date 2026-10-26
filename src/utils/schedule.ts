import { EventCourse, Semester } from '../types';

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isEventScheduledOnDate(
  event: EventCourse,
  dateIso: string,
  semesters: Semester[]
): boolean {
  const date = new Date(`${dateIso}T12:00:00`);
  const rawDay = date.getDay();
  const dayOfWeek = rawDay === 0 ? 7 : rawDay;
  if (event.dayOfWeek !== dayOfWeek) return false;

  if (event.date) return event.date === dateIso;
  if (event.startDate && dateIso < event.startDate) return false;
  if (event.endDate && dateIso > event.endDate) return false;

  if (event.isRecurring === false) {
    return Boolean(event.startDate && event.endDate &&
      dateIso >= event.startDate && dateIso <= event.endDate);
  }

  if (!event.startDate && !event.endDate && event.semesterId) {
    const semester = semesters.find((item) => item.id === event.semesterId);
    if (semester?.startDate && dateIso < semester.startDate) return false;
    if (semester?.endDate && dateIso > semester.endDate) return false;
  }

  return true;
}
