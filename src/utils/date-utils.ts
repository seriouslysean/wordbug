/**
 * Formats a date string into a localized date
 * @param dateStr - Date string in YYYYMMDD format
 * @returns Formatted date string
 */
export const formatDate = (dateStr: string): string => {
    if (!dateStr) return dateStr;

    try {
        if (dateStr.length !== 8 || !/^\d{8}$/.test(dateStr)) {
            return dateStr;
        }

        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));

        const date = new globalThis.Date(year, month, day);

        if (isNaN(date.getTime())) {
            return dateStr;
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateStr;
    }
};
