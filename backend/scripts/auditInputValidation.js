const { validatePayload } = require("../middleware/requestValidation");

const checks = [
  ["rejects mobile numbers over 10 digits", { mobile: "98765432101" }, false],
  ["accepts and normalizes a formatted 10-digit phone", { phone: "(98765) 43210" }, true],
  ["rejects Aadhaar numbers over 12 digits", { aadhar_number: "1234567890123" }, false],
  ["accepts and normalizes a formatted Aadhaar", { aadhaarNumber: "1234 5678 9012" }, true],
  ["rejects invalid calendar dates", { issue_date: "2026-02-30" }, false],
  ["rejects future dates of birth", { date_of_birth: "2100-01-01" }, false],
  ["rejects reversed date ranges", { from_date: "2026-02-02", to_date: "2026-02-01" }, false],
  ["rejects invalid emails", { email: "invalid-email" }, false],
  ["rejects invalid PIN codes", { pincode: "1234567" }, false],
  ["rejects negative financial values", { basic_salary: -1 }, false],
  ["rejects percentages above 100", { percentage: 101 }, false],
  [
    "accepts a valid representative payload",
    {
      email: "student@example.com",
      guardian_phone: "9876543210",
      aadhar_number: "123456789012",
      date_of_birth: "2012-05-20",
      pincode: "226001",
      basic_salary: 25000,
      percentage: 85.5,
    },
    true,
  ],
];

let failed = 0;
for (const [name, payload, expected] of checks) {
  const result = validatePayload(payload);
  if (result.valid === expected) {
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}: ${result.errors.join(" ") || "unexpectedly accepted"}`);
  }
}

if (failed) process.exitCode = 1;
