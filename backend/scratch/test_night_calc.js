import { calculateStayNights, parseDateSafe } from '../utils/dateUtils.js';

console.log("--- Testing Stay Nights Calculation ---");

const testCases = [
  { checkIn: '04-09-2026', checkOut: '05-09-2026', expected: 1, label: 'DD-MM-YYYY (1 night - User prompt case)' },
  { checkIn: '04/09/2026', checkOut: '05/09/2026', expected: 1, label: 'DD/MM/YYYY (1 night)' },
  { checkIn: '2026-09-04', checkOut: '2026-09-05', expected: 1, label: 'YYYY-MM-DD (1 night)' },
  { checkIn: '04-09-2026', checkOut: '07-09-2026', expected: 3, label: 'DD-MM-YYYY (3 nights)' },
  { checkIn: '2026-09-04', checkOut: '2026-09-07', expected: 3, label: 'YYYY-MM-DD (3 nights)' },
  { checkIn: '04-09-2026', checkOut: '04-09-2026', expected: 1, label: 'Same-day check-in & check-out fallback (1 night)' },
  { checkIn: '05-09-2026', checkOut: '04-09-2026', expected: 1, label: 'Invalid reverse dates fallback (1 night)' },
  { checkIn: 'today', checkOut: 'tomorrow', expected: 1, label: 'today -> tomorrow' },
];

let allPassed = true;
for (const tc of testCases) {
  const actual = calculateStayNights(tc.checkIn, tc.checkOut);
  const pass = actual === tc.expected;
  if (!pass) allPassed = false;
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${tc.label} | Input: [${tc.checkIn} -> ${tc.checkOut}] | Got: ${actual} | Expected: ${tc.expected}`);
}

console.log("--- Testing Date Parsing Safety ---");
const parseCases = [
  { input: '04-09-2026', expectedMonth: 8, expectedDate: 4, label: 'DD-MM-YYYY 04-09-2026 is 4th Sept' },
  { input: '05-09-2026', expectedMonth: 8, expectedDate: 5, label: 'DD-MM-YYYY 05-09-2026 is 5th Sept' },
  { input: '2026-09-04', expectedMonth: 8, expectedDate: 4, label: 'YYYY-MM-DD 2026-09-04 is 4th Sept' },
];

for (const pc of parseCases) {
  const d = parseDateSafe(pc.input);
  const pass = d && d.getMonth() === pc.expectedMonth && d.getDate() === pc.expectedDate;
  if (!pass) allPassed = false;
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: ${pc.label} | Parsed: ${d?.toISOString()} (Month: ${d?.getMonth()}, Date: ${d?.getDate()})`);
}

if (allPassed) {
  console.log("\n🎉 ALL NIGHT CALCULATION AND DATE PARSING TESTS PASSED!");
  process.exit(0);
} else {
  console.error("\n❌ SOME TESTS FAILED!");
  process.exit(1);
}
