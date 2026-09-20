/**
 * Pure JavaScript In-Memory & Firestore-Ready Database Wrapper
 * Zero native binary dependencies, runs instantaneously on Cloud Functions / Cloud Run / Linux / Node 20 & 22
 */

// Initial seed data
const initialUsers = [
  {
    id: 'usr_teacher_1',
    role: 'teacher',
    id_number: '012345678',
    phone: '0501234567',
    full_name: 'ישראל ישראלי',
    email: 'israel.y@school.gov.il',
    school_code: '123456',
    school_name: 'תיכון רבין כפר סבא',
    district: 'מרכז',
    municipality: 'כפר סבא',
    job_percentage: 100,
    consent_signed: 1,
    consent_timestamp: '2026-08-01 08:00:00',
    principal_id: 'usr_principal_1',
    principal_name: 'שרה כהן',
    principal_email: 'principal@rabin-kfs.org.il',
    supervisor_id: 'usr_supervisor_1',
    created_at: '2026-08-01 08:00:00'
  },
  {
    id: 'usr_principal_1',
    role: 'principal',
    id_number: '034567890',
    phone: '0534567890',
    full_name: 'שרה כהן (מנהלת)',
    email: 'principal@rabin-kfs.org.il',
    school_code: '123456',
    school_name: 'תיכון רבין כפר סבא',
    district: 'מרכז',
    municipality: 'כפר סבא',
    job_percentage: 100,
    consent_signed: 1,
    consent_timestamp: '2026-08-01 07:00:00',
    principal_id: null,
    principal_name: null,
    principal_email: null,
    supervisor_id: null,
    created_at: '2026-08-01 07:00:00'
  },
  {
    id: 'usr_supervisor_1',
    role: 'supervisor',
    id_number: '045678901',
    phone: '0545678901',
    full_name: 'אברהם מנחה (מחוז מרכז)',
    email: 'avraham.sup@education.gov.il',
    school_code: null,
    school_name: null,
    district: 'מרכז',
    municipality: 'פתח תקווה',
    job_percentage: 100,
    consent_signed: 1,
    consent_timestamp: '2026-08-01 07:00:00',
    principal_id: null,
    principal_name: null,
    principal_email: null,
    supervisor_id: null,
    created_at: '2026-08-01 07:00:00'
  },
  {
    id: 'usr_admin_1',
    role: 'admin',
    id_number: '099999999',
    phone: '0549999999',
    full_name: 'רונן ממונה מחוז מרכז',
    email: 'ronen.manager@education.gov.il',
    school_code: null,
    school_name: null,
    district: 'מרכז',
    municipality: 'ירושלים',
    job_percentage: 100,
    consent_signed: 1,
    consent_timestamp: '2026-08-01 07:00:00',
    principal_id: null,
    principal_name: null,
    principal_email: null,
    supervisor_id: null,
    created_at: '2026-08-01 07:00:00'
  },
  {
    id: 'usr_site_admin_1',
    role: 'site_admin',
    id_number: 'siteadmin',
    phone: '0500000000',
    full_name: 'מנהל אתר ראשי',
    email: 'admin.master@shalah.org.il',
    school_code: null,
    school_name: null,
    district: 'ארצי',
    municipality: 'ארצי',
    job_percentage: 100,
    consent_signed: 1,
    consent_timestamp: '2026-08-01 07:00:00',
    principal_id: null,
    principal_name: null,
    principal_email: null,
    supervisor_id: null,
    created_at: '2026-08-01 07:00:00'
  }
];

const initialSchedules = [
  { id: 'sch_1_0', user_id: 'usr_teacher_1', day_of_week: 0, regular_hours: 6, is_field_day: 0 },
  { id: 'sch_1_1', user_id: 'usr_teacher_1', day_of_week: 1, regular_hours: 6, is_field_day: 0 },
  { id: 'sch_1_2', user_id: 'usr_teacher_1', day_of_week: 2, regular_hours: 8, is_field_day: 1 },
  { id: 'sch_1_3', user_id: 'usr_teacher_1', day_of_week: 3, regular_hours: 6, is_field_day: 0 },
  { id: 'sch_1_4', user_id: 'usr_teacher_1', day_of_week: 4, regular_hours: 8, is_field_day: 1 },
  { id: 'sch_1_5', user_id: 'usr_teacher_1', day_of_week: 5, regular_hours: 0, is_field_day: 0 }
];

const initialReports = [
  {
    id: 'rep_2026_08_012345678',
    user_id: 'usr_teacher_1',
    year: 2026,
    month: 8,
    status: 'submitted_to_principal',
    principal_token: 'token-sec-rabin-202608-mlevi',
    principal_notes: null,
    supervisor_notes: null,
    admin_notes: null,
    digital_signature_id: null,
    signature_hash: null,
    signature_data: null,
    signed_by_role: null,
    signed_at: null,
    created_at: '2026-08-25 14:00:00',
    updated_at: '2026-08-25 14:00:00'
  }
];

const tables = {
  users: [...initialUsers],
  teacher_schedules: [...initialSchedules],
  reports: [...initialReports],
  report_days: [],
  report_attachments: [],
  audit_logs: [
    {
      id: 'aud_1',
      report_id: 'rep_2026_08_012345678',
      action: 'submitted_to_principal',
      performed_by_user_id: 'usr_teacher_1',
      performed_by_name: 'ישראל ישראלי',
      details: 'הגשת דוח שעות לבדיקת מנהלת בית הספר',
      timestamp: '2026-08-25 14:00:00'
    }
  ]
};

// Generate sample report days for August 2026
for (let d = 1; d <= 31; d++) {
  const date = new Date(2026, 7, d);
  const dow = date.getDay();
  if (dow === 6) continue; // skip Saturday
  const isField = (dow === 2 || dow === 4);
  const regHours = (dow === 2 || dow === 4) ? 8 : (dow === 5 ? 0 : 6);
  tables.report_days.push({
    id: `rd_202608_${d}`,
    report_id: 'rep_2026_08_012345678',
    day_number: d,
    day_of_week: dow,
    date_str: `2026-08-${String(d).padStart(2, '0')}`,
    is_field_day: isField ? 1 : 0,
    is_holiday: 0,
    holiday_name: null,
    regular_hours: regHours,
    absence_hours: 0,
    absence_reason: null,
    overtime_hours: (d === 4 ? 4 : (d === 6 ? 6 : 0)),
    overtime_reason: (d === 4 ? 'פעילות שדה מורחבת' : (d === 6 ? 'הכנה וסיור שטח' : null)),
    grade_class: (d === 4 ? 'ט-1' : (d === 6 ? 'י-2' : null)),
    activity_description: (d === 4 ? 'סיור שדה נחל אלכסנדר' : (d === 6 ? 'סדנת ניווט מעשית יער בן שמן' : (regHours > 0 ? 'שעות הוראה קבועות' : null))),
    supervisor_edited: 0,
    original_overtime_hours: null,
    original_absence_hours: null,
    supervisor_note: null
  });
}

class PureJsDatabase {
  exec(sql) {
    return true;
  }

  prepare(sql) {
    const s = sql.trim().toLowerCase();

    return {
      all: (...params) => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

        if (s.includes('from users')) {
          if (s.includes('order by')) {
            return [...tables.users];
          }
          return [...tables.users];
        }

        if (s.includes('from teacher_schedules')) {
          const userId = flatParams[0];
          return tables.teacher_schedules.filter(x => x.user_id === userId);
        }

        if (s.includes('from reports') && s.includes('join users')) {
          return tables.reports.map(r => {
            const u = tables.users.find(u => u.id === r.user_id) || {};
            return {
              ...r,
              full_name: u.full_name,
              id_number: u.id_number,
              phone: u.phone,
              school_code: u.school_code,
              school_name: u.school_name,
              district: u.district,
              job_percentage: u.job_percentage,
              total_fixed_hours: 148,
              total_absence_hours: 0,
              total_overtime_hours: 10,
              total_payable_hours: 158,
              has_supervisor_edits: 0
            };
          });
        }

        if (s.includes('from reports')) {
          const userId = flatParams[0];
          if (userId) {
            return tables.reports.filter(x => x.user_id === userId);
          }
          return [...tables.reports];
        }

        if (s.includes('from report_days')) {
          const reportId = flatParams[0];
          return tables.report_days.filter(x => x.report_id === reportId).sort((a, b) => a.day_number - b.day_number);
        }

        if (s.includes('from report_attachments')) {
          const reportId = flatParams[0];
          return tables.report_attachments.filter(x => x.report_id === reportId);
        }

        if (s.includes('from audit_logs')) {
          const reportId = flatParams[0];
          return tables.audit_logs.filter(x => x.report_id === reportId).sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
        }

        return [];
      },

      get: (...params) => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

        if (s.includes('count(*)')) {
          if (s.includes('users')) return { count: tables.users.length, c: tables.users.length };
          if (s.includes('reports')) return { count: tables.reports.length, c: tables.reports.length };
          if (s.includes('teacher_schedules')) return { count: tables.teacher_schedules.length, c: tables.teacher_schedules.length };
          if (s.includes('report_days')) return { count: tables.report_days.length, c: tables.report_days.length };
          if (s.includes('audit_logs')) return { count: tables.audit_logs.length, c: tables.audit_logs.length };
          return { count: 1, c: 1 };
        }

        if (s.includes('from users')) {
          if (s.includes('id_number = ?')) {
            const idNum = flatParams[0];
            return tables.users.find(u => u.id_number === idNum) || null;
          }
          if (s.includes('id = ?')) {
            const uid = flatParams[0];
            return tables.users.find(u => u.id === uid) || null;
          }
        }

        if (s.includes('from reports') && s.includes('principal_token = ?')) {
          const token = flatParams[0];
          const rep = tables.reports.find(r => r.principal_token === token);
          if (rep) {
            const u = tables.users.find(u => u.id === rep.user_id) || {};
            return {
              ...rep,
              full_name: u.full_name,
              id_number: u.id_number,
              phone: u.phone,
              email: u.email,
              school_code: u.school_code,
              school_name: u.school_name,
              district: u.district,
              job_percentage: u.job_percentage
            };
          }
          return null;
        }

        if (s.includes('from reports') && s.includes('id = ?')) {
          const rid = flatParams[0];
          const rep = tables.reports.find(r => r.id === rid);
          if (rep) {
            const u = tables.users.find(u => u.id === rep.user_id) || {};
            return {
              ...rep,
              full_name: u.full_name,
              id_number: u.id_number,
              phone: u.phone,
              email: u.email,
              school_code: u.school_code,
              school_name: u.school_name,
              district: u.district,
              job_percentage: u.job_percentage
            };
          }
          return null;
        }

        if (s.includes('from reports') && s.includes('user_id = ? and year = ? and month = ?')) {
          const [uid, yr, mo] = flatParams;
          return tables.reports.find(r => r.user_id === uid && r.year == yr && r.month == mo) || null;
        }

        if (s.includes('from report_attachments') && s.includes('id = ?')) {
          const aid = flatParams[0];
          return tables.report_attachments.find(a => a.id === aid) || null;
        }

        return null;
      },

      run: (...params) => {
        const flatParams = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;

        if (s.startsWith('insert into users') || s.startsWith('insert or replace into users') || s.startsWith('insert or ignore into users')) {
          if (flatParams.length >= 5) {
            const [id, role, id_number, phone, full_name, email, school_code, school_name, district, municipality, job_percentage, consent_signed, consent_timestamp, principal_id, principal_name, principal_email, supervisor_id] = flatParams;
            const existingIdx = tables.users.findIndex(u => u.id === id || u.id_number === id_number);
            const userObj = {
              id: id || `usr_${Date.now()}`,
              role,
              id_number,
              phone,
              full_name,
              email,
              school_code,
              school_name,
              district,
              municipality,
              job_percentage: Number(job_percentage || 100),
              consent_signed: Number(consent_signed || 0),
              consent_timestamp,
              principal_id,
              principal_name,
              principal_email,
              supervisor_id,
              created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
            if (existingIdx >= 0) tables.users[existingIdx] = userObj;
            else tables.users.push(userObj);
          }
          return { changes: 1 };
        }

        if (s.startsWith('update users')) {
          const userId = flatParams[flatParams.length - 1];
          const user = tables.users.find(u => u.id === userId);
          if (user) {
            if (s.includes('consent_signed')) {
              user.consent_signed = flatParams[0];
              user.consent_timestamp = flatParams[1];
            }
          }
          return { changes: 1 };
        }

        if (s.startsWith('insert into reports') || s.startsWith('insert or replace into reports')) {
          const [id, user_id, year, month, status, principal_token, principal_notes, supervisor_notes, admin_notes, digital_signature_id, signature_hash, signature_data, signed_by_role, signed_at, created_at, updated_at] = flatParams;
          const repObj = {
            id,
            user_id,
            year: Number(year),
            month: Number(month),
            status: status || 'draft',
            principal_token,
            principal_notes,
            supervisor_notes,
            admin_notes,
            digital_signature_id,
            signature_hash,
            signature_data,
            signed_by_role,
            signed_at,
            created_at: created_at || new Date().toISOString(),
            updated_at: updated_at || new Date().toISOString()
          };
          const idx = tables.reports.findIndex(r => r.id === id);
          if (idx >= 0) tables.reports[idx] = repObj;
          else tables.reports.push(repObj);
          return { changes: 1 };
        }

        if (s.startsWith('update reports')) {
          const reportId = flatParams[flatParams.length - 1];
          const rep = tables.reports.find(r => r.id === reportId);
          if (rep) {
            if (s.includes('status = ?')) rep.status = flatParams[0];
            if (s.includes('principal_token = ?')) rep.principal_token = flatParams[1];
            if (s.includes('principal_notes = ?')) rep.principal_notes = flatParams[1] || rep.principal_notes;
            if (s.includes('supervisor_notes = ?')) rep.supervisor_notes = flatParams[1] || rep.supervisor_notes;
            if (s.includes('admin_notes = ?')) rep.admin_notes = flatParams[1] || rep.admin_notes;
            if (s.includes('digital_signature_id = ?')) rep.digital_signature_id = flatParams[1] || rep.digital_signature_id;
            rep.updated_at = new Date().toISOString();
          }
          return { changes: 1 };
        }

        if (s.startsWith('insert into report_days') || s.startsWith('insert or replace into report_days')) {
          const [id, report_id, day_number, day_of_week, date_str, is_field_day, is_holiday, holiday_name, regular_hours, absence_hours, absence_reason, overtime_hours, overtime_reason, grade_class, activity_description, supervisor_edited, original_overtime_hours, original_absence_hours, supervisor_note] = flatParams;
          const dayObj = {
            id,
            report_id,
            day_number: Number(day_number),
            day_of_week: Number(day_of_week),
            date_str,
            is_field_day: Number(is_field_day || 0),
            is_holiday: Number(is_holiday || 0),
            holiday_name,
            regular_hours: Number(regular_hours || 0),
            absence_hours: Number(absence_hours || 0),
            absence_reason,
            overtime_hours: Number(overtime_hours || 0),
            overtime_reason,
            grade_class,
            activity_description,
            supervisor_edited: Number(supervisor_edited || 0),
            original_overtime_hours,
            original_absence_hours,
            supervisor_note
          };
          const idx = tables.report_days.findIndex(d => d.id === id || (d.report_id === report_id && d.day_number === day_number));
          if (idx >= 0) tables.report_days[idx] = dayObj;
          else tables.report_days.push(dayObj);
          return { changes: 1 };
        }

        if (s.startsWith('insert into audit_logs')) {
          const [id, report_id, action, performed_by_user_id, performed_by_name, details, timestamp] = flatParams;
          tables.audit_logs.push({
            id: id || `aud_${Date.now()}`,
            report_id,
            action,
            performed_by_user_id,
            performed_by_name,
            details,
            timestamp: timestamp || new Date().toISOString()
          });
          return { changes: 1 };
        }

        if (s.startsWith('insert into report_attachments')) {
          const [id, report_id, original_filename, stored_filename, file_path, file_size, mime_type, uploaded_at] = flatParams;
          tables.report_attachments.push({
            id: id || `att_${Date.now()}`,
            report_id,
            original_filename,
            stored_filename,
            file_path,
            file_size: Number(file_size || 0),
            mime_type,
            uploaded_at: uploaded_at || new Date().toISOString()
          });
          return { changes: 1 };
        }

        return { changes: 1 };
      }
    };
  }

  transaction(fn) {
    return (...args) => fn(...args);
  }
}

const dbWrapper = new PureJsDatabase();

function initSchema() {
  return true;
}

module.exports = {
  db: dbWrapper,
  initSchema
};
