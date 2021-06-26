const formatLocalDate = function (date) {
    console.log(date);
    const now = date || new Date(),
        tzo = -now.getTimezoneOffset(),
        dif = tzo >= 0 ? '+' : '-',
        pad = function (num) {
            var norm = Math.abs(Math.floor(num));
            return (norm < 10 ? '0' : '') + norm;
        };
    return now.getFullYear()
        + '-' + pad(now.getMonth() + 1)
        + '-' + pad(now.getDate())
        + 'T' + pad(now.getHours())
        + ':' + pad(now.getMinutes())
        + ':' + pad(now.getSeconds())
        + dif + pad(tzo / 60)
        + ':' + pad(tzo % 60);
}


const datetimeNow = () => formatLocalDate().slice(0, 19).replace('T', ' ');
const datetimeParam = (date) => formatLocalDate(date).slice(0, 19).replace('T', ' ');


function daysInMonth(month, year) { // Use 1 for January, 2 for February, etc.
    return new Date(year, month, 0).getDate();
}

module.exports = { formatLocalDate, datetimeNow, daysInMonth,datetimeParam }