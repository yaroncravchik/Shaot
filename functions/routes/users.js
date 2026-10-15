const express = require('express');
const router = express.Router();
const { FirestoreDB } = require('../db/firestore-db');

/**
 * GET /api/users
 * Returns all registered users from Cloud Firestore
 */
router.get('/', async (req, res) => {
  try {
    const users = await FirestoreDB.getAllUsers();
    return res.json({
      success: true,
      users: users || []
    });
  } catch (err) {
    console.error('Error fetching users from Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בטעינת משתמשים מ-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * POST /api/users
 * Save / create a single user directly in Cloud Firestore
 */
router.post('/', async (req, res) => {
  try {
    const userData = req.body;
    if (!userData || (!userData.id && !userData.id_number && !userData.username)) {
      return res.status(400).json({
        success: false,
        error: 'חובה לציין מזהה משתמש / שם משתמש.'
      });
    }

    const userId = String(userData.id || userData.username || userData.id_number || '').trim();
    const cleanUserData = {
      ...userData,
      id: userId,
      username: String(userData.username || userId).trim()
    };

    const savedUser = await FirestoreDB.saveUser(cleanUserData);
    return res.json({
      success: true,
      user: savedUser,
      message: 'המשתמש נשמר בהצלחה ב-Cloud Firestore'
    });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בשמירת משתמש ב-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * POST /api/users/batch
 * Batch import / save multiple users into Cloud Firestore
 */
router.post('/batch', async (req, res) => {
  try {
    const usersList = req.body.users || req.body;
    if (!Array.isArray(usersList) || usersList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'נא להעביר מערך משתמשים לייבוא.'
      });
    }

    const saved = await FirestoreDB.saveUsersBatch(usersList);
    return res.json({
      success: true,
      count: saved.length,
      users: saved,
      message: `נקלטו ${saved.length} משתמשים בהצלחה ב-Cloud Firestore`
    });
  } catch (err) {
    console.error('Error batch saving users to Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בייבוא מרוכז ל-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user details in Cloud Firestore
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const newUsername = String(body.username || body.newId || body.id || id).trim();

    let updated;
    if (newUsername && newUsername !== id) {
      // Username/ID changed: save under newUsername, delete old doc id
      updated = await FirestoreDB.saveUser({ ...body, id: newUsername, username: newUsername });
      await FirestoreDB.deleteUser(id);
      await FirestoreDB.cascadeTeacherIdChange(id, newUsername, body.name || body.full_name);
    } else {
      updated = await FirestoreDB.saveUser({ ...body, id, username: newUsername || id });
    }

    return res.json({
      success: true,
      user: updated,
      message: 'פרטי המשתמש עודכנו בהצלחה ב-Cloud Firestore'
    });
  } catch (err) {
    console.error('Error updating user in Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה בעדכון משתמש ב-Cloud Firestore: ' + err.message
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user from Cloud Firestore
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await FirestoreDB.deleteUser(id);
    return res.json({
      success: true,
      message: 'המשתמש נמחק בהצלחה מ-Cloud Firestore'
    });
  } catch (err) {
    console.error('Error deleting user from Firestore:', err);
    return res.status(500).json({
      success: false,
      error: 'שגיאה במחיקת משתמש מ-Cloud Firestore: ' + err.message
    });
  }
});

module.exports = router;
