import dayjs from 'dayjs'

/**
 * Format a date to be safe for use in a path.
 *
 * @param date The date to format.
 * @returns The formatted date.
 */
export const pathSafeDateTime = (date: Date) =>
  dayjs(date).format('YYYY-MM-DD HH.mm.ss')
