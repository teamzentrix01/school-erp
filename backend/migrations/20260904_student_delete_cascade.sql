-- Student deletion must remove gateway order rows along with fee records.
-- The original schema used NO ACTION for both foreign keys, which blocked
-- DELETE /api/admin/students/:id whenever an online-payment order existed.
ALTER TABLE fee_payment_orders
  DROP CONSTRAINT IF EXISTS fee_payment_orders_student_id_fkey,
  ADD CONSTRAINT fee_payment_orders_student_id_fkey
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

ALTER TABLE fee_payment_orders
  DROP CONSTRAINT IF EXISTS fee_payment_orders_student_fee_id_fkey,
  ADD CONSTRAINT fee_payment_orders_student_fee_id_fkey
    FOREIGN KEY (student_fee_id) REFERENCES student_fees(id) ON DELETE CASCADE;
