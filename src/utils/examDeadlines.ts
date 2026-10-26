import { DeadlineItem, Exam } from '../types';

export function isExamRegistrationConfirmed(exam: Exam): boolean {
  return Boolean(exam.registrationSentAt && exam.registrationConfirmedAt);
}

export function getExamRegistrationDeadlines(exams: Exam[]): DeadlineItem[] {
  const deadlines: DeadlineItem[] = [];

  exams.forEach((exam) => {
    if (exam.status === 'bestanden' || exam.status === 'nicht_bestanden') return;

    const registrationConfirmed = isExamRegistrationConfirmed(exam);
    if (exam.registrationDeadline && !registrationConfirmed) {
      deadlines.push({
        id: `reg-dl-${exam.id}`,
        title: `Anmeldefrist: ${exam.title}`,
        dueDate: exam.registrationDeadline,
        moduleId: exam.moduleId,
        type: 'anmeldung',
        isCompleted: false,
        priority: 'dringend',
        details: `Anmeldung für: ${exam.title} (${exam.date})`,
      });
    }

    if (exam.withdrawalDeadline && registrationConfirmed) {
      deadlines.push({
        id: `withdrawal-dl-${exam.id}`,
        title: `Rücktrittsfrist: ${exam.title}`,
        dueDate: exam.withdrawalDeadline,
        moduleId: exam.moduleId,
        type: 'ruecktritt',
        isCompleted: false,
        priority: 'dringend',
        details: `Rücktritt von der Prüfung: ${exam.title} (${exam.date})`,
      });
    }
  });

  return deadlines;
}
