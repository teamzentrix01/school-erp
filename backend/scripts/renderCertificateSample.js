const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { renderCertificate } = require("../controllers/certificateController");

const outputDir = path.resolve(__dirname, "../../output/pdf");
fs.mkdirSync(outputDir, { recursive: true });
const outputPath = path.join(outputDir, "sample-character-certificate.pdf");
const doc = new PDFDocument({ size: "A4", margin: 55 });
doc.pipe(fs.createWriteStream(outputPath));
renderCertificate(doc, {
  certificate_type: "character",
  certificate_number: "CC-2026-000001",
  student_name: "Sample Student",
  admission_number: "STU-2026-0001",
  roll_number: "101",
  class: "10",
  section: "A",
  conduct: "Good",
  remarks: "Issued for academic purposes.",
  issued_at: new Date("2026-09-04T00:00:00Z"),
});
console.log(outputPath);
