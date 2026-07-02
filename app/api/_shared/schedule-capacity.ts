export const SCHEDULE_HORIZON_DAYS = 14;

export function startOfDay(input: Date) {
  const next = new Date(input);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function addDays(input: Date, days: number) {
  const next = new Date(input);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

export function toIsoDate(input: Date) {
  return startOfDay(input).toISOString();
}

export function parseIsoDate(input: string) {
  return startOfDay(new Date(input));
}

export function buildHorizonDates(
  start = new Date(),
  days = SCHEDULE_HORIZON_DAYS,
) {
  return Array.from({ length: days }, (_, index) =>
    toIsoDate(addDays(startOfDay(start), index)),
  );
}

export function getDayOfWeek(input: Date) {
  return input.getDay();
}

export function clampMinutes(value: number) {
  return Math.max(0, Math.round(value));
}

export function getWeekdayCapacityMinutes(
  weekdays: Array<{
    day_of_week: number;
    available_minutes: number;
  }>,
  date: Date,
) {
  const dayOfWeek = getDayOfWeek(date);

  return weekdays
    .filter((weekday) => weekday.day_of_week === dayOfWeek)
    .reduce(
      (total, weekday) => total + Math.max(0, weekday.available_minutes),
      0,
    );
}

export function calculateShiftMinutes(
  shifts: Array<{
    day_of_week: number;
    start_minute: number;
    end_minute: number;
    is_active: boolean;
  }>,
  date: Date,
) {
  const dayOfWeek = getDayOfWeek(date);

  return shifts
    .filter((shift) => shift.is_active && shift.day_of_week === dayOfWeek)
    .reduce(
      (total, shift) =>
        total + Math.max(0, shift.end_minute - shift.start_minute),
      0,
    );
}

export function applyMinuteExceptions(
  baseMinutes: number,
  exceptions: Array<{
    exception_date: Date;
    available_minutes: number;
  }>,
  date: Date,
) {
  const matching = exceptions.filter(
    (exception) => toIsoDate(exception.exception_date) === toIsoDate(date),
  );

  if (matching.length === 0) {
    return baseMinutes;
  }

  return Math.max(
    0,
    matching[matching.length - 1]?.available_minutes ?? baseMinutes,
  );
}

export function applyExceptions(
  baseMinutes: number,
  exceptions: Array<{
    exception_date: Date;
    start_minute: number | null;
    end_minute: number | null;
    is_available: boolean;
  }>,
  date: Date,
) {
  const matching = exceptions.filter(
    (exception) => toIsoDate(exception.exception_date) === toIsoDate(date),
  );

  if (matching.length === 0) {
    return baseMinutes;
  }

  let current = baseMinutes;
  for (const exception of matching) {
    const minutes =
      exception.start_minute !== null && exception.end_minute !== null
        ? Math.max(0, exception.end_minute - exception.start_minute)
        : baseMinutes;
    current = exception.is_available ? minutes : 0;
  }

  return current;
}
