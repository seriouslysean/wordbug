/**
 * Formats a date string into a localized date
 * @param {string} dateStr - Date string in YYYYMMDD format
 * @returns {string} - Formatted date string
 */
export const formatDate = (dateStr) => {
    try {
        const date = new Date(
            dateStr.substring(0, 4),
            parseInt(dateStr.substring(4, 6)) - 1,
            dateStr.substring(6, 8)
        );
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
