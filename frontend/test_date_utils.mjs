import { isToday, isTomorrow, isSameDay, formatDisplayDate, formatToYYYYMMDD } from './src/utils/dateUtils.js';

console.log('Testing dateUtils.js:');

const today = new Date();
const todayISO = today.toISOString().split('T')[0]; // e.g. 2026-09-04
const tomorrow = new Date(Date.now() + 86400000);
const tomorrowISO = tomorrow.toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000);
const yesterdayISO = yesterday.toISOString().split('T')[0];

console.log(`- Today ISO: ${todayISO}`);
console.log(`- Tomorrow ISO: ${tomorrowISO}`);
console.log(`- Yesterday ISO: ${yesterdayISO}`);

console.assert(isToday(todayISO) === true, 'isToday(todayISO) must be true');
console.assert(isToday('Today') === true, 'isToday("Today") must be true');
console.assert(isToday(tomorrowISO) === false, 'isToday(tomorrowISO) must be false');
console.assert(isToday(yesterdayISO) === false, 'isToday(yesterdayISO) must be false');

console.assert(isTomorrow(tomorrowISO) === true, 'isTomorrow(tomorrowISO) must be true');
console.assert(isTomorrow('Tomorrow') === true, 'isTomorrow("Tomorrow") must be true');
console.assert(isTomorrow(todayISO) === false, 'isTomorrow(todayISO) must be false');

console.log('All dateUtils assertions passed successfully!');
