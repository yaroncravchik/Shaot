const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db } = require('../db/database');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

let multer = null;
let uploadMiddleware = null;

try {
  multer = require('multer');

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      const uniqueName = `att_${Date.now()}_${crypto.randomUUID().substring(0, 8)}${ext}`;
      cb(null, uniqueName);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('סוג קובץ לא נתמך. ניתן להעלות קובצי PDF, PNG או JPG בלבד.'), false);
    }
  };

  uploadMiddleware = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter
  }).single('file');
} catch (e) {
  // If multer not installed, dummy middleware
  uploadMiddleware = (req, res, next) => next();
}

/**
 * POST /api/upload/:reportId
 * Upload an attachment (Medical certificate, Reserve duty order, etc.)
 */
router.post('/:reportId', (req, res) => {
  if (!multer) {
    return res.status(500).json({ success: false, error: 'רכיב העלאת קבצים (multer) אינו מותקן.' });
  }

  uploadMiddleware(req, res, err => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message || 'שגיאה בהעלאת הקובץ.' });
    }

    try {
      const { reportId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ success: false, error: 'לא נבחר קובץ להעלאה.' });
      }

      const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
      if (!report) {
        // Delete uploaded file if report doesn't exist
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(404).json({ success: false, error: 'דוח לא נמצא.' });
      }

      if (report.status !== 'draft' && report.status !== 'returned_to_teacher') {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(403).json({ success: false, error: 'לא ניתן להוסיף קבצים לדוח נעול.' });
      }

      const attachmentId = `att_${crypto.randomUUID()}`;
      const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

      db.prepare(`
        INSERT INTO report_attachments (
          id, report_id, original_filename, stored_filename, file_path, file_size, mime_type, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        attachmentId,
        reportId,
        file.originalname,
        file.filename,
        file.path,
        file.size,
        file.mimetype,
        now
      );

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
        VALUES (?, ?, 'uploaded_attachment', ?, NULL, ?, ?)
      `).run(
        `aud_${crypto.randomUUID()}`,
        reportId,
        report.user_id,
        `העלאת נספח/אישור: ${file.originalname}`,
        now
      );

      return res.json({
        success: true,
        message: 'הקובץ הועלה בהצלחה.',
        attachment: {
          id: attachmentId,
          original_filename: file.originalname,
          stored_filename: file.filename,
          file_size: file.size,
          mime_type: file.mimetype,
          uploaded_at: now
        }
      });
    } catch (innerErr) {
      console.error('Save attachment error:', innerErr);
      return res.status(500).json({ success: false, error: 'שגיאה בשמירת נתוני הקובץ.' });
    }
  });
});

/**
 * GET /api/upload/:fileId
 * Download / View an attachment
 */
router.get('/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;

    const attachment = db.prepare('SELECT * FROM report_attachments WHERE id = ?').get(fileId);
    if (!attachment) {
      return res.status(404).json({ success: false, error: 'קובץ לא נמצא.' });
    }

    const filePath = attachment.file_path || path.join(uploadDir, attachment.stored_filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'קובץ פיזי לא נמצא בשרת.' });
    }

    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.original_filename)}"`);
    return res.sendFile(filePath);
  } catch (err) {
    console.error('Get attachment error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה בהורדת הקובץ.' });
  }
});

/**
 * DELETE /api/upload/:fileId
 * Delete an attachment from report
 */
router.delete('/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;

    const attachment = db.prepare(`
      SELECT a.*, r.status, r.user_id
      FROM report_attachments a
      JOIN reports r ON a.report_id = r.id
      WHERE a.id = ?
    `).get(fileId);

    if (!attachment) {
      return res.status(404).json({ success: false, error: 'קובץ לא נמצא.' });
    }

    if (attachment.status !== 'draft' && attachment.status !== 'returned_to_teacher') {
      return res.status(403).json({ success: false, error: 'לא ניתן למחוק קבצים מדוח נעול.' });
    }

    // Remove from disk
    const filePath = attachment.file_path || path.join(uploadDir, attachment.stored_filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove from DB
    db.prepare('DELETE FROM report_attachments WHERE id = ?').run(fileId);

    // Audit log
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    db.prepare(`
      INSERT INTO audit_logs (id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp)
      VALUES (?, ?, 'deleted_attachment', ?, NULL, ?, ?)
    `).run(
      `aud_${crypto.randomUUID()}`,
      attachment.report_id,
      attachment.user_id,
      `מחיקת נספח/אישור: ${attachment.original_filename}`,
      now
    );

    return res.json({ success: true, message: 'הקובץ נמחק בהצלחה.' });
  } catch (err) {
    console.error('Delete attachment error:', err);
    return res.status(500).json({ success: false, error: 'שגיאה במחיקת הקובץ.' });
  }
});

module.exports = router;
