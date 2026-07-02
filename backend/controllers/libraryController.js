const pool = require("../config/db");

const getLibrary = async (_req, res) => {
  try {
    const [books, issues, students] = await Promise.all([
      pool.query(
        `SELECT b.*,
                CASE WHEN b.available_copies = 0 THEN 'Issued'
                     WHEN b.status <> 'Active' THEN b.status
                     ELSE 'Available' END AS availability_status
         FROM library_books b
         ORDER BY b.title`,
      ),
      pool.query(
        `SELECT li.*, b.title AS book_title, b.accession_number,
                u.name AS student_name, s.roll_number, s.class, s.section,
                CASE
                  WHEN li.return_date IS NULL AND li.due_date < CURRENT_DATE THEN 'Overdue'
                  ELSE li.status
                END AS current_status,
                CASE
                  WHEN li.return_date IS NULL AND li.due_date < CURRENT_DATE
                  THEN GREATEST(CURRENT_DATE - li.due_date, 0) * 5
                  ELSE li.fine_amount
                END AS calculated_fine
         FROM library_issues li
         JOIN library_books b ON b.id = li.book_id
         JOIN students s ON s.id = li.student_id
         JOIN users u ON u.id = s.user_id
         ORDER BY li.created_at DESC`,
      ),
      pool.query(
        `SELECT s.id, s.roll_number, s.class, s.section, u.name
         FROM students s JOIN users u ON u.id = s.user_id
         WHERE COALESCE(s.is_active, TRUE)=TRUE
         ORDER BY u.name`,
      ),
    ]);
    res.json({
      books: books.rows,
      issues: issues.rows,
      students: students.rows,
    });
  } catch (error) {
    console.error("getLibrary:", error);
    res.status(500).json({ message: "Failed to load library" });
  }
};

const saveBook = async (req, res) => {
  const {
    accession_number,
    title,
    author,
    isbn,
    category,
    publisher,
    publication_year,
    rack,
    total_copies = 1,
    status = "Active",
  } = req.body;
  if (!accession_number?.trim() || !title?.trim()) {
    return res
      .status(400)
      .json({ message: "Accession number and title are required" });
  }
  const copies = Number(total_copies);
  if (!Number.isInteger(copies) || copies < 0) {
    return res
      .status(400)
      .json({ message: "Total copies must be a whole number" });
  }
  try {
    if (req.params.id) {
      const current = await pool.query(
        "SELECT total_copies, available_copies FROM library_books WHERE id=$1",
        [req.params.id],
      );
      if (!current.rows.length) {
        return res.status(404).json({ message: "Book not found" });
      }
      const issued =
        Number(current.rows[0].total_copies) -
        Number(current.rows[0].available_copies);
      if (copies < issued) {
        return res.status(400).json({
          message: `Cannot reduce copies below ${issued}; those copies are currently issued`,
        });
      }
      const result = await pool.query(
        `UPDATE library_books SET
           accession_number=$1, title=$2, author=$3, isbn=$4, category=$5,
           publisher=$6, publication_year=$7, rack=$8, total_copies=$9,
           available_copies=$9 - $10, status=$11, updated_at=NOW()
         WHERE id=$12 RETURNING *`,
        [
          accession_number.trim(),
          title.trim(),
          author || null,
          isbn || null,
          category || null,
          publisher || null,
          publication_year || null,
          rack || null,
          copies,
          issued,
          status,
          req.params.id,
        ],
      );
      return res.json(result.rows[0]);
    }
    const result = await pool.query(
      `INSERT INTO library_books
         (accession_number,title,author,isbn,category,publisher,publication_year,
          rack,total_copies,available_copies,status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10)
       RETURNING *`,
      [
        accession_number.trim(),
        title.trim(),
        author || null,
        isbn || null,
        category || null,
        publisher || null,
        publication_year || null,
        rack || null,
        copies,
        status,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("saveBook:", error);
    if (error.code === "23505") {
      return res
        .status(409)
        .json({ message: "Accession number already exists" });
    }
    res.status(500).json({ message: "Failed to save book" });
  }
};

const deleteBook = async (req, res) => {
  try {
    const active = await pool.query(
      "SELECT 1 FROM library_issues WHERE book_id=$1 AND return_date IS NULL LIMIT 1",
      [req.params.id],
    );
    if (active.rows.length) {
      return res
        .status(409)
        .json({ message: "Return all issued copies first" });
    }
    const result = await pool.query(
      "DELETE FROM library_books WHERE id=$1 RETURNING id",
      [req.params.id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: "Book not found" });
    }
    res.json({ message: "Book deleted" });
  } catch (error) {
    console.error("deleteBook:", error);
    res.status(500).json({ message: "Failed to delete book" });
  }
};

const issueBook = async (req, res) => {
  const { book_id, student_id, due_date, notes } = req.body;
  if (!book_id || !student_id || !due_date) {
    return res
      .status(400)
      .json({ message: "Book, student, and due date are required" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const book = await client.query(
      "SELECT * FROM library_books WHERE id=$1 FOR UPDATE",
      [book_id],
    );
    if (!book.rows.length || Number(book.rows[0].available_copies) < 1) {
      throw new Error("No copy is currently available");
    }
    const duplicate = await client.query(
      `SELECT 1 FROM library_issues
       WHERE book_id=$1 AND student_id=$2 AND return_date IS NULL`,
      [book_id, student_id],
    );
    if (duplicate.rows.length) {
      throw new Error("This student already has an active issue for this book");
    }
    const result = await client.query(
      `INSERT INTO library_issues
         (book_id,student_id,due_date,issued_by,notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [book_id, student_id, due_date, req.user.id, notes || null],
    );
    await client.query(
      "UPDATE library_books SET available_copies=available_copies-1,updated_at=NOW() WHERE id=$1",
      [book_id],
    );
    await client.query("COMMIT");
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("issueBook:", error);
    res.status(400).json({ message: error.message || "Failed to issue book" });
  } finally {
    client.release();
  }
};

const returnBook = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const issue = await client.query(
      "SELECT * FROM library_issues WHERE id=$1 FOR UPDATE",
      [req.params.id],
    );
    if (!issue.rows.length || issue.rows[0].return_date) {
      throw new Error("Active issue not found");
    }
    const fine = Math.max(
      0,
      Math.ceil(
        (Date.now() - new Date(issue.rows[0].due_date).getTime()) / 86400000,
      ) * 5,
    );
    const result = await client.query(
      `UPDATE library_issues SET return_date=CURRENT_DATE,status='Returned',
         fine_amount=$1,fine_paid=$2,returned_by=$3,updated_at=NOW()
       WHERE id=$4 RETURNING *`,
      [
        fine,
        Boolean(req.body.fine_paid) || fine === 0,
        req.user.id,
        req.params.id,
      ],
    );
    await client.query(
      "UPDATE library_books SET available_copies=available_copies+1,updated_at=NOW() WHERE id=$1",
      [issue.rows[0].book_id],
    );
    await client.query("COMMIT");
    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("returnBook:", error);
    res.status(400).json({ message: error.message || "Failed to return book" });
  } finally {
    client.release();
  }
};

const getStudentLibrary = async (req, res) => {
  try {
    const student = await pool.query(
      "SELECT id FROM students WHERE user_id=$1",
      [req.user.id],
    );
    if (!student.rows.length) {
      return res.status(404).json({ message: "Student not found" });
    }
    const result = await pool.query(
      `SELECT li.*,b.title,b.author,b.accession_number,
              CASE WHEN li.return_date IS NULL AND li.due_date<CURRENT_DATE
                   THEN 'Overdue' ELSE li.status END AS current_status,
              CASE WHEN li.return_date IS NULL AND li.due_date<CURRENT_DATE
                   THEN (CURRENT_DATE-li.due_date)*5 ELSE li.fine_amount END AS calculated_fine
       FROM library_issues li JOIN library_books b ON b.id=li.book_id
       WHERE li.student_id=$1 ORDER BY li.created_at DESC`,
      [student.rows[0].id],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getStudentLibrary:", error);
    res.status(500).json({ message: "Failed to load library account" });
  }
};

module.exports = {
  getLibrary,
  saveBook,
  deleteBook,
  issueBook,
  returnBook,
  getStudentLibrary,
};
