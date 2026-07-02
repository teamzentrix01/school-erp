const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const documentSelect = `
  SELECT d.*,u.name AS student_name,s.roll_number,s.class,s.section,
         verifier.name AS verified_by_name
  FROM student_documents d
  JOIN students s ON s.id=d.student_id
  JOIN users u ON u.id=s.user_id
  LEFT JOIN users verifier ON verifier.id=d.verified_by`;

const getDocuments = async (req, res) => {
  try {
    const params = [];
    let where = "";
    if (req.params.studentId) {
      params.push(req.params.studentId);
      where = " WHERE d.student_id=$1";
    }
    const result = await pool.query(
      `${documentSelect}${where} ORDER BY d.created_at DESC`,
      params,
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getDocuments:", error);
    res.status(500).json({ message: "Failed to load documents" });
  }
};

const getMyDocuments = async (req, res) => {
  try {
    const result = await pool.query(
      `${documentSelect}
       WHERE s.user_id=$1 ORDER BY d.created_at DESC`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getMyDocuments:", error);
    res.status(500).json({ message: "Failed to load documents" });
  }
};

const uploadDocument = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: "Document file is required" });
  const {
    student_id,
    document_type,
    title,
    document_number,
    issue_date,
    expiry_date,
  } = req.body;
  if (!student_id || !document_type || !title?.trim()) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({
      message: "Student, document type, and title are required",
    });
  }
  try {
    const result = await pool.query(
      `INSERT INTO student_documents
         (student_id,document_type,title,file_name,file_url,mime_type,file_size,
          document_number,issue_date,expiry_date,uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        student_id,
        document_type,
        title.trim(),
        req.file.originalname,
        `/uploads/documents/${req.file.filename}`,
        req.file.mimetype,
        req.file.size,
        document_number || null,
        issue_date || null,
        expiry_date || null,
        req.user.id,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    console.error("uploadDocument:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
};

const verifyDocument = async (req, res) => {
  try {
    const verified = req.body.verified !== false;
    const result = await pool.query(
      `UPDATE student_documents SET verified=$1,verified_by=$2,updated_at=NOW()
       WHERE id=$3 RETURNING *`,
      [verified, verified ? req.user.id : null, req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Document not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("verifyDocument:", error);
    res.status(500).json({ message: "Failed to update verification" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM student_documents WHERE id=$1 RETURNING file_url",
      [req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Document not found" });
    }
    const relative = result.rows[0].file_url.replace(/^\/+/, "");
    const filePath = path.resolve(__dirname, "..", relative);
    const uploadRoot = path.resolve(__dirname, "../uploads/documents");
    if (filePath.startsWith(uploadRoot)) fs.unlink(filePath, () => {});
    res.json({ message: "Document deleted" });
  } catch (error) {
    console.error("deleteDocument:", error);
    res.status(500).json({ message: "Failed to delete document" });
  }
};

module.exports = {
  getDocuments,
  getMyDocuments,
  uploadDocument,
  verifyDocument,
  deleteDocument,
};
