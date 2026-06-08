/* =====================================================================
 * Swahilipot Hub · Attachment Portal (static prototype)
 * ---------------------------------------------------------------------
 * A dependency-free, role-based front end backed by localStorage. The
 * code is organised into small modules:
 *
 *   db        — localStorage persistence + one-time seed
 *   auth      — login / logout / session / role guards
 *   notify    — in-app notifications (supervisor alerts) + toasts
 *   ui        — modal / toast / small DOM helpers
 *   router    — hash routing with role-based redirection
 *   pages     — render functions for each role dashboard
 *
 * Auth is a simulation: passwords live in localStorage in plain text and
 * this is intentional for a front-end-only prototype. Swap `auth.login`
 * for a real API call to integrate a backend.
 * =================================================================== */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   * Constants
   * ------------------------------------------------------------------ */
  const KEYS = {
    users: 'sph.users',
    departments: 'sph.departments',
    submissions: 'sph.submissions',
    notifications: 'sph.notifications',
    settings: 'sph.settings',
    session: 'sph.session',
    seeded: 'sph.seeded.v1',
  };

  const ROLES = { ATTACHEE: 'attachee', SUPERVISOR: 'supervisor', ADMIN: 'admin' };

  const STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  };

  // Max upload size we are willing to base64-stuff into localStorage.
  const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB
  const ALLOWED_EXT = ['pdf', 'docx', 'doc'];

  /* ================================================================== *
   * db — persistence layer
   * ================================================================== */
  const db = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      localStorage.removeItem(key);
    },
    uid(prefix) {
      return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
    },
  };

  /* ------------------------------------------------------------------ *
   * Seed — runs once to populate demo data
   * ------------------------------------------------------------------ */
  function seedData() {
    if (db.get(KEYS.seeded)) return;

    const departments = [
      { id: 'dep-software', name: 'Software Development' },
      { id: 'dep-creatives', name: 'Creatives & Design' },
      { id: 'dep-data', name: 'Data & Analytics' },
      { id: 'dep-comms', name: 'Communications' },
    ];

    const users = [
      { id: 'u-admin', name: 'Amina Yusuf', email: 'admin@swahilipot.org', password: 'admin123', role: ROLES.ADMIN, departmentId: null, supervisorId: null },
      { id: 'u-sup-1', name: 'Brian Otieno', email: 'supervisor@swahilipot.org', password: 'super123', role: ROLES.SUPERVISOR, departmentId: 'dep-software', supervisorId: null },
      { id: 'u-sup-2', name: 'Faith Wanjiru', email: 'faith@swahilipot.org', password: 'super123', role: ROLES.SUPERVISOR, departmentId: 'dep-creatives', supervisorId: null },
      { id: 'u-att-1', name: 'Joy Mwende', email: 'attachee@swahilipot.org', password: 'attach123', role: ROLES.ATTACHEE, departmentId: 'dep-software', supervisorId: 'u-sup-1' },
      { id: 'u-att-2', name: 'Kevin Omondi', email: 'kevin@swahilipot.org', password: 'attach123', role: ROLES.ATTACHEE, departmentId: 'dep-software', supervisorId: 'u-sup-1' },
      { id: 'u-att-3', name: 'Halima Said', email: 'halima@swahilipot.org', password: 'attach123', role: ROLES.ATTACHEE, departmentId: 'dep-creatives', supervisorId: 'u-sup-2' },
    ];

    const now = Date.now();
    const submissions = [
      { id: 'sub-1', attacheeId: 'u-att-1', departmentId: 'dep-software', title: 'Week 1 — Environment setup report', description: 'Documented local setup and tooling.', fileName: 'week1-report.pdf', fileType: 'application/pdf', fileData: null, status: STATUS.APPROVED, comment: 'Great detail, well done.', submittedAt: now - 6 * 864e5, reviewedAt: now - 5 * 864e5 },
      { id: 'sub-2', attacheeId: 'u-att-1', departmentId: 'dep-software', title: 'Week 2 — API integration', description: 'Connected the weather widget to the API.', fileName: 'week2-api.docx', fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileData: null, status: STATUS.PENDING, comment: '', submittedAt: now - 1 * 864e5, reviewedAt: null },
      { id: 'sub-3', attacheeId: 'u-att-2', departmentId: 'dep-software', title: 'Week 1 — Onboarding checklist', description: 'Completed onboarding tasks.', fileName: 'onboarding.pdf', fileType: 'application/pdf', fileData: null, status: STATUS.PENDING, comment: '', submittedAt: now - 2 * 864e5, reviewedAt: null },
      { id: 'sub-4', attacheeId: 'u-att-3', departmentId: 'dep-creatives', title: 'Brand poster draft', description: 'First draft of the event poster.', fileName: 'poster.pdf', fileType: 'application/pdf', fileData: null, status: STATUS.REJECTED, comment: 'Use the official brand blue, please resubmit.', submittedAt: now - 3 * 864e5, reviewedAt: now - 2 * 864e5 },
    ];

    const notifications = [
      { id: 'n-1', forUserId: 'u-sup-1', type: 'submission', message: 'Kevin Omondi submitted “Week 1 — Onboarding checklist”.', read: false, createdAt: now - 2 * 864e5, link: '#supervisor' },
      { id: 'n-2', forUserId: 'u-sup-1', type: 'submission', message: 'Joy Mwende submitted “Week 2 — API integration”.', read: false, createdAt: now - 1 * 864e5, link: '#supervisor' },
    ];

    const settings = {
      siteName: 'Swahilipot Hub Attachment Portal',
      tagline: 'Empowering youth through technology, arts and culture.',
      allowRegistrations: false,
      maxFileMb: 2,
    };

    db.set(KEYS.departments, departments);
    db.set(KEYS.users, users);
    db.set(KEYS.submissions, submissions);
    db.set(KEYS.notifications, notifications);
    db.set(KEYS.settings, settings);
    db.set(KEYS.seeded, true);
  }

  /* ------------------------------------------------------------------ *
   * Collection helpers
   * ------------------------------------------------------------------ */
  const data = {
    users: () => db.get(KEYS.users, []),
    departments: () => db.get(KEYS.departments, []),
    submissions: () => db.get(KEYS.submissions, []),
    notifications: () => db.get(KEYS.notifications, []),
    settings: () => db.get(KEYS.settings, {}),

    userById: (id) => data.users().find((u) => u.id === id) || null,
    deptById: (id) => data.departments().find((d) => d.id === id) || null,
    deptName: (id) => (data.deptById(id) ? data.deptById(id).name : '—'),

    saveUsers: (arr) => db.set(KEYS.users, arr),
    saveDepartments: (arr) => db.set(KEYS.departments, arr),
    saveSubmissions: (arr) => db.set(KEYS.submissions, arr),
    saveNotifications: (arr) => db.set(KEYS.notifications, arr),
    saveSettings: (obj) => db.set(KEYS.settings, obj),
  };

  /* ================================================================== *
   * auth — authentication + role guards
   * ================================================================== */
  const auth = {
    login(email, password) {
      const user = data.users().find(
        (u) => u.email.toLowerCase() === String(email).trim().toLowerCase() && u.password === password
      );
      if (!user) return { ok: false, error: 'Invalid email or password.' };
      db.set(KEYS.session, { userId: user.id, at: Date.now() });
      return { ok: true, user };
    },
    logout() {
      db.remove(KEYS.session);
    },
    /** Current logged-in user object, or null. */
    currentUser() {
      const session = db.get(KEYS.session);
      if (!session) return null;
      return data.userById(session.userId);
    },
    /** Map a user to the hash route for their role. */
    detectRole(user) {
      return user ? user.role : null;
    },
    dashboardRoute(role) {
      switch (role) {
        case ROLES.ATTACHEE: return '#attachee';
        case ROLES.SUPERVISOR: return '#supervisor';
        case ROLES.ADMIN: return '#admin';
        default: return '#login';
      }
    },
  };

  /* ================================================================== *
   * ui — DOM + toast + modal helpers
   * ================================================================== */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const ui = {
    el(tag, props, children) {
      const node = document.createElement(tag);
      if (props) {
        Object.keys(props).forEach((k) => {
          if (k === 'class') node.className = props[k];
          else if (k === 'html') node.innerHTML = props[k];
          else if (k === 'text') node.textContent = props[k];
          else if (k.startsWith('on') && typeof props[k] === 'function') {
            node.addEventListener(k.slice(2).toLowerCase(), props[k]);
          } else if (props[k] !== null && props[k] !== undefined) {
            node.setAttribute(k, props[k]);
          }
        });
      }
      (children || []).forEach((c) => {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
      return node;
    },

    toast(message, kind) {
      const root = $('#toast-root');
      const t = ui.el('div', { class: 'toast toast-' + (kind || 'info'), text: message });
      root.appendChild(t);
      requestAnimationFrame(() => t.classList.add('show'));
      setTimeout(() => {
        t.classList.remove('show');
        setTimeout(() => t.remove(), 250);
      }, 3200);
    },

    openModal(title, bodyNode) {
      $('#modal-title').textContent = title;
      const body = $('#modal-body');
      body.innerHTML = '';
      body.appendChild(bodyNode);
      $('#modal-root').hidden = false;
    },
    closeModal() {
      $('#modal-root').hidden = true;
      $('#modal-body').innerHTML = '';
    },
  };

  /* ================================================================== *
   * notify — notifications + badge
   * ================================================================== */
  const notify = {
    add(forUserId, message, link, type) {
      const all = data.notifications();
      all.unshift({
        id: db.uid('n'),
        forUserId,
        type: type || 'info',
        message,
        link: link || null,
        read: false,
        createdAt: Date.now(),
      });
      data.saveNotifications(all);
    },
    forUser(userId) {
      return data.notifications().filter((n) => n.forUserId === userId);
    },
    unreadCount(userId) {
      return notify.forUser(userId).filter((n) => !n.read).length;
    },
    markAllRead(userId) {
      const all = data.notifications().map((n) => (n.forUserId === userId ? { ...n, read: true } : n));
      data.saveNotifications(all);
    },
    renderBell() {
      const user = auth.currentUser();
      if (!user) return;
      const count = notify.unreadCount(user.id);
      const badge = $('#bell-count');
      badge.hidden = count === 0;
      badge.textContent = count > 9 ? '9+' : String(count);

      const list = $('#bell-list');
      list.innerHTML = '';
      const items = notify.forUser(user.id);
      if (items.length === 0) {
        list.appendChild(ui.el('li', { class: 'bell-empty', text: 'No notifications yet.' }));
        return;
      }
      items.slice(0, 12).forEach((n) => {
        list.appendChild(
          ui.el('li', { class: 'bell-item' + (n.read ? '' : ' unread') }, [
            ui.el('p', { class: 'bell-msg', text: n.message }),
            ui.el('span', { class: 'bell-time', text: fmtRelative(n.createdAt) }),
          ])
        );
      });
    },
  };

  /* ================================================================== *
   * util — formatting + files
   * ================================================================== */
  function fmtDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtRelative(ts) {
    const diff = Date.now() - ts;
    const d = Math.floor(diff / 864e5);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 7) return d + ' days ago';
    return fmtDate(ts);
  }
  function initials(name) {
    return String(name || '?')
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function statusBadge(status) {
    return ui.el('span', { class: 'badge badge-' + status, text: status.charAt(0).toUpperCase() + status.slice(1) });
  }
  function fileExt(name) {
    return String(name).split('.').pop().toLowerCase();
  }
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  /* ================================================================== *
   * pages — role dashboards
   * ================================================================== */
  const pages = {};

  /* ---------------------------- ATTACHEE ---------------------------- */
  pages.attachee = function (user) {
    setHeader('My Attachment', 'Submit work and track your progress');
    const root = ui.el('div', { class: 'stack' });

    // Profile card
    const mySubs = data.submissions().filter((s) => s.attacheeId === user.id);
    const approved = mySubs.filter((s) => s.status === STATUS.APPROVED).length;
    const pending = mySubs.filter((s) => s.status === STATUS.PENDING).length;

    root.appendChild(
      ui.el('section', { class: 'card profile-card' }, [
        ui.el('div', { class: 'avatar avatar-lg', text: initials(user.name) }),
        ui.el('div', { class: 'profile-meta' }, [
          ui.el('h3', { class: 'profile-name', text: user.name }),
          ui.el('p', { class: 'profile-line', text: user.email }),
          ui.el('p', { class: 'profile-line' }, [
            ui.el('span', { class: 'pill', text: 'Department: ' + data.deptName(user.departmentId) }),
            ui.el('span', { class: 'pill', text: 'Supervisor: ' + (data.userById(user.supervisorId) ? data.userById(user.supervisorId).name : '—') }),
          ]),
        ]),
      ])
    );

    // Stat tiles
    root.appendChild(
      statRow([
        ['Total submissions', mySubs.length],
        ['Approved', approved],
        ['Pending review', pending],
      ])
    );

    // Submission form
    const form = ui.el('form', { class: 'card', id: 'submit-form' }, [
      ui.el('h3', { class: 'card-title', text: 'Submit an assignment' }),
      field('Title', ui.el('input', { type: 'text', id: 'a-title', required: 'required', placeholder: 'e.g. Week 3 — Database schema' })),
      field('Description', ui.el('textarea', { id: 'a-desc', rows: '3', placeholder: 'Short summary of the work' })),
      field('File (PDF or DOCX, max 2 MB)', ui.el('input', { type: 'file', id: 'a-file', accept: '.pdf,.doc,.docx', required: 'required' })),
      ui.el('p', { class: 'form-error', id: 'a-error', hidden: 'hidden' }),
      ui.el('button', { type: 'submit', class: 'btn btn-primary', text: 'Submit assignment' }),
    ]);
    form.addEventListener('submit', (e) => handleSubmitAssignment(e, user));
    root.appendChild(form);

    // Submissions list
    const listCard = ui.el('section', { class: 'card' }, [ui.el('h3', { class: 'card-title', text: 'My submissions' })]);
    if (mySubs.length === 0) {
      listCard.appendChild(emptyState('No submissions yet. Use the form above to add your first assignment.'));
    } else {
      const table = buildTable(['Title', 'File', 'Submitted', 'Status', 'Feedback']);
      mySubs
        .slice()
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .forEach((s) => {
          table.tbody.appendChild(
            ui.el('tr', {}, [
              ui.el('td', {}, [ui.el('strong', { text: s.title }), ui.el('div', { class: 'muted small', text: s.description || '' })]),
              ui.el('td', {}, [fileLink(s)]),
              ui.el('td', { text: fmtDate(s.submittedAt) }),
              ui.el('td', {}, [statusBadge(s.status)]),
              ui.el('td', { class: 'muted', text: s.comment || '—' }),
            ])
          );
        });
      listCard.appendChild(table.wrap);
    }
    root.appendChild(listCard);

    return root;
  };

  function handleSubmitAssignment(e, user) {
    e.preventDefault();
    const title = $('#a-title').value.trim();
    const desc = $('#a-desc').value.trim();
    const fileInput = $('#a-file');
    const err = $('#a-error');
    err.hidden = true;

    const file = fileInput.files[0];
    if (!title || !file) {
      err.textContent = 'Title and a file are required.';
      err.hidden = false;
      return;
    }
    if (ALLOWED_EXT.indexOf(fileExt(file.name)) === -1) {
      err.textContent = 'Only PDF, DOC or DOCX files are allowed.';
      err.hidden = false;
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      err.textContent = 'File is larger than 2 MB. Please upload a smaller file.';
      err.hidden = false;
      return;
    }

    readFileAsDataUrl(file).then((dataUrl) => {
      const subs = data.submissions();
      const sub = {
        id: db.uid('sub'),
        attacheeId: user.id,
        departmentId: user.departmentId,
        title,
        description: desc,
        fileName: file.name,
        fileType: file.type,
        fileData: dataUrl,
        status: STATUS.PENDING,
        comment: '',
        submittedAt: Date.now(),
        reviewedAt: null,
      };
      subs.push(sub);
      data.saveSubmissions(subs);

      // Notify the attachee's supervisor (or all dept supervisors).
      const supervisors = data
        .users()
        .filter((u) => u.role === ROLES.SUPERVISOR && (u.id === user.supervisorId || u.departmentId === user.departmentId));
      supervisors.forEach((sup) => notify.add(sup.id, user.name + ' submitted “' + title + '”.', '#supervisor', 'submission'));

      ui.toast('Assignment submitted for review.', 'success');
      router.render();
    });
  }

  /* --------------------------- SUPERVISOR --------------------------- */
  pages.supervisor = function (user) {
    setHeader('Supervisor Dashboard', data.deptName(user.departmentId) + ' department');
    const root = ui.el('div', { class: 'stack' });

    const attachees = data.users().filter((u) => u.role === ROLES.ATTACHEE && u.departmentId === user.departmentId);
    const attacheeIds = attachees.map((a) => a.id);
    const deptSubs = data.submissions().filter((s) => attacheeIds.indexOf(s.attacheeId) !== -1);
    const pending = deptSubs.filter((s) => s.status === STATUS.PENDING);

    root.appendChild(
      statRow([
        ['Attachees', attachees.length],
        ['Submissions', deptSubs.length],
        ['Awaiting review', pending.length],
        ['Approved', deptSubs.filter((s) => s.status === STATUS.APPROVED).length],
      ])
    );

    // Attachees + progress
    const teamCard = ui.el('section', { class: 'card' }, [ui.el('h3', { class: 'card-title', text: 'Attachees in my department' })]);
    if (attachees.length === 0) {
      teamCard.appendChild(emptyState('No attachees assigned to this department yet.'));
    } else {
      const table = buildTable(['Name', 'Email', 'Submissions', 'Approved', 'Progress']);
      attachees.forEach((a) => {
        const subs = deptSubs.filter((s) => s.attacheeId === a.id);
        const ok = subs.filter((s) => s.status === STATUS.APPROVED).length;
        const pct = subs.length ? Math.round((ok / subs.length) * 100) : 0;
        table.tbody.appendChild(
          ui.el('tr', {}, [
            ui.el('td', {}, [ui.el('strong', { text: a.name })]),
            ui.el('td', { class: 'muted', text: a.email }),
            ui.el('td', { text: String(subs.length) }),
            ui.el('td', { text: String(ok) }),
            ui.el('td', {}, [progressBar(pct)]),
          ])
        );
      });
      teamCard.appendChild(table.wrap);
    }
    root.appendChild(teamCard);

    // Review queue
    const reviewCard = ui.el('section', { class: 'card' }, [ui.el('h3', { class: 'card-title', text: 'Assignment review queue' })]);
    if (deptSubs.length === 0) {
      reviewCard.appendChild(emptyState('No submissions from your department yet.'));
    } else {
      const table = buildTable(['Attachee', 'Assignment', 'File', 'Submitted', 'Status', 'Action']);
      deptSubs
        .slice()
        .sort((a, b) => b.submittedAt - a.submittedAt)
        .forEach((s) => {
          const att = data.userById(s.attacheeId);
          table.tbody.appendChild(
            ui.el('tr', {}, [
              ui.el('td', { text: att ? att.name : '—' }),
              ui.el('td', {}, [ui.el('strong', { text: s.title }), ui.el('div', { class: 'muted small', text: s.description || '' })]),
              ui.el('td', {}, [fileLink(s)]),
              ui.el('td', { text: fmtDate(s.submittedAt) }),
              ui.el('td', {}, [statusBadge(s.status)]),
              ui.el('td', {}, [ui.el('button', { class: 'btn btn-sm btn-outline', text: 'Review', onClick: () => openReviewModal(s.id) })]),
            ])
          );
        });
      reviewCard.appendChild(table.wrap);
    }
    root.appendChild(reviewCard);

    return root;
  };

  function openReviewModal(subId) {
    const sub = data.submissions().find((s) => s.id === subId);
    if (!sub) return;
    const att = data.userById(sub.attacheeId);

    const comment = ui.el('textarea', { rows: '3', class: 'w-full', placeholder: 'Leave a comment for the attachee', text: sub.comment || '' });
    const body = ui.el('div', { class: 'stack-sm' }, [
      ui.el('p', {}, [ui.el('strong', { text: att ? att.name : '—' }), document.createTextNode(' · ' + data.deptName(sub.departmentId))]),
      ui.el('h4', { text: sub.title }),
      ui.el('p', { class: 'muted', text: sub.description || 'No description.' }),
      ui.el('p', {}, [fileLink(sub)]),
      field('Comment', comment),
      ui.el('div', { class: 'modal-actions' }, [
        ui.el('button', { class: 'btn btn-danger', text: 'Reject', onClick: () => reviewSubmission(subId, STATUS.REJECTED, comment.value) }),
        ui.el('button', { class: 'btn btn-success', text: 'Approve', onClick: () => reviewSubmission(subId, STATUS.APPROVED, comment.value) }),
      ]),
    ]);
    ui.openModal('Review submission', body);
  }

  function reviewSubmission(subId, status, comment) {
    const subs = data.submissions();
    const idx = subs.findIndex((s) => s.id === subId);
    if (idx === -1) return;
    subs[idx].status = status;
    subs[idx].comment = comment || '';
    subs[idx].reviewedAt = Date.now();
    data.saveSubmissions(subs);

    // Notify the attachee of the outcome.
    notify.add(subs[idx].attacheeId, 'Your assignment “' + subs[idx].title + '” was ' + status + '.', '#attachee', 'review');

    ui.closeModal();
    ui.toast('Submission ' + status + '.', status === STATUS.APPROVED ? 'success' : 'info');
    router.render();
  }

  /* ----------------------------- ADMIN ----------------------------- */
  pages.admin = function () {
    setHeader('Admin Control Panel', 'Manage the portal and view system reports');
    const root = ui.el('div', { class: 'stack' });

    const users = data.users();
    const subs = data.submissions();
    const depts = data.departments();

    // System-wide stats
    root.appendChild(
      statRow([
        ['Departments', depts.length],
        ['Supervisors', users.filter((u) => u.role === ROLES.SUPERVISOR).length],
        ['Attachees', users.filter((u) => u.role === ROLES.ATTACHEE).length],
        ['Submissions', subs.length],
      ])
    );

    // Analytics — submissions per department
    root.appendChild(analyticsCard(depts, subs));

    // Department management
    root.appendChild(deptManagerCard(depts));

    // People management
    root.appendChild(peopleCard(users));

    // Site settings
    root.appendChild(settingsCard());

    return root;
  };

  function analyticsCard(depts, subs) {
    const card = ui.el('section', { class: 'card' }, [
      ui.el('h3', { class: 'card-title', text: 'Analytics — submissions per department' }),
    ]);

    const counts = depts.map((d) => ({
      name: d.name,
      total: subs.filter((s) => s.departmentId === d.id).length,
      approved: subs.filter((s) => s.departmentId === d.id && s.status === STATUS.APPROVED).length,
    }));
    const max = Math.max(1, ...counts.map((c) => c.total));

    const chart = ui.el('div', { class: 'chart' });
    counts.forEach((c) => {
      chart.appendChild(
        ui.el('div', { class: 'chart-row' }, [
          ui.el('span', { class: 'chart-label', text: c.name }),
          ui.el('div', { class: 'chart-track' }, [
            ui.el('div', { class: 'chart-bar', style: 'width:' + Math.round((c.total / max) * 100) + '%' }, [
              ui.el('span', { class: 'chart-val', text: String(c.total) }),
            ]),
          ]),
          ui.el('span', { class: 'chart-approved muted small', text: c.approved + ' approved' }),
        ])
      );
    });
    card.appendChild(chart);

    // Status breakdown
    const byStatus = ui.el('div', { class: 'status-breakdown' }, [
      miniStat('Pending', subs.filter((s) => s.status === STATUS.PENDING).length, 'pending'),
      miniStat('Approved', subs.filter((s) => s.status === STATUS.APPROVED).length, 'approved'),
      miniStat('Rejected', subs.filter((s) => s.status === STATUS.REJECTED).length, 'rejected'),
    ]);
    card.appendChild(byStatus);
    return card;
  }

  function deptManagerCard(depts) {
    const card = ui.el('section', { class: 'card' }, [ui.el('h3', { class: 'card-title', text: 'Departments' })]);

    const addForm = ui.el('form', { class: 'inline-form' }, [
      ui.el('input', { type: 'text', id: 'new-dept', placeholder: 'New department name' }),
      ui.el('button', { type: 'submit', class: 'btn btn-primary btn-sm', text: 'Add' }),
    ]);
    addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#new-dept').value.trim();
      if (!name) return;
      const all = data.departments();
      all.push({ id: db.uid('dep'), name });
      data.saveDepartments(all);
      ui.toast('Department added.', 'success');
      router.render();
    });
    card.appendChild(addForm);

    const table = buildTable(['Department', 'Supervisors', 'Attachees', 'Action']);
    depts.forEach((d) => {
      const sups = data.users().filter((u) => u.role === ROLES.SUPERVISOR && u.departmentId === d.id).length;
      const atts = data.users().filter((u) => u.role === ROLES.ATTACHEE && u.departmentId === d.id).length;
      table.tbody.appendChild(
        ui.el('tr', {}, [
          ui.el('td', {}, [ui.el('strong', { text: d.name })]),
          ui.el('td', { text: String(sups) }),
          ui.el('td', { text: String(atts) }),
          ui.el('td', {}, [
            ui.el('button', {
              class: 'btn btn-sm btn-danger-outline',
              text: 'Delete',
              onClick: () => deleteDepartment(d.id),
            }),
          ]),
        ])
      );
    });
    card.appendChild(table.wrap);
    return card;
  }

  function deleteDepartment(id) {
    const inUse = data.users().some((u) => u.departmentId === id);
    if (inUse) {
      ui.toast('Cannot delete: department has assigned members.', 'error');
      return;
    }
    data.saveDepartments(data.departments().filter((d) => d.id !== id));
    ui.toast('Department deleted.', 'info');
    router.render();
  }

  function peopleCard(users) {
    const card = ui.el('section', { class: 'card' }, [ui.el('h3', { class: 'card-title', text: 'Supervisors & attachees' })]);

    // Add-user form
    const depts = data.departments();
    const roleSel = ui.el('select', { id: 'nu-role' }, [
      ui.el('option', { value: ROLES.ATTACHEE, text: 'Attachee' }),
      ui.el('option', { value: ROLES.SUPERVISOR, text: 'Supervisor' }),
      ui.el('option', { value: ROLES.ADMIN, text: 'Admin' }),
    ]);
    const deptSel = ui.el('select', { id: 'nu-dept' }, depts.map((d) => ui.el('option', { value: d.id, text: d.name })));
    const form = ui.el('form', { class: 'grid-form' }, [
      ui.el('input', { type: 'text', id: 'nu-name', placeholder: 'Full name', required: 'required' }),
      ui.el('input', { type: 'email', id: 'nu-email', placeholder: 'Email', required: 'required' }),
      ui.el('input', { type: 'text', id: 'nu-pass', placeholder: 'Password', required: 'required' }),
      roleSel,
      deptSel,
      ui.el('button', { type: 'submit', class: 'btn btn-primary btn-sm', text: 'Add user' }),
    ]);
    form.addEventListener('submit', addUser);
    card.appendChild(form);

    const table = buildTable(['Name', 'Email', 'Role', 'Department', 'Action']);
    users.forEach((u) => {
      table.tbody.appendChild(
        ui.el('tr', {}, [
          ui.el('td', {}, [ui.el('strong', { text: u.name })]),
          ui.el('td', { class: 'muted', text: u.email }),
          ui.el('td', {}, [ui.el('span', { class: 'pill pill-' + u.role, text: u.role })]),
          ui.el('td', { text: u.departmentId ? data.deptName(u.departmentId) : '—' }),
          ui.el('td', {}, [
            u.role === ROLES.ADMIN
              ? ui.el('span', { class: 'muted small', text: 'protected' })
              : ui.el('button', { class: 'btn btn-sm btn-danger-outline', text: 'Remove', onClick: () => removeUser(u.id) }),
          ]),
        ])
      );
    });
    card.appendChild(table.wrap);
    return card;
  }

  function addUser(e) {
    e.preventDefault();
    const name = $('#nu-name').value.trim();
    const email = $('#nu-email').value.trim();
    const pass = $('#nu-pass').value.trim();
    const role = $('#nu-role').value;
    const departmentId = role === ROLES.ADMIN ? null : $('#nu-dept').value;
    if (!name || !email || !pass) return;
    const users = data.users();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      ui.toast('A user with that email already exists.', 'error');
      return;
    }
    users.push({ id: db.uid('u'), name, email, password: pass, role, departmentId, supervisorId: null });
    data.saveUsers(users);
    ui.toast('User added.', 'success');
    router.render();
  }

  function removeUser(id) {
    data.saveUsers(data.users().filter((u) => u.id !== id));
    ui.toast('User removed.', 'info');
    router.render();
  }

  function settingsCard() {
    const s = data.settings();
    const card = ui.el('section', { class: 'card' }, [ui.el('h3', { class: 'card-title', text: 'Site settings' })]);
    const form = ui.el('form', { class: 'stack-sm' }, [
      field('Site name', ui.el('input', { type: 'text', id: 'set-name', value: s.siteName || '' })),
      field('Tagline', ui.el('input', { type: 'text', id: 'set-tag', value: s.tagline || '' })),
      ui.el('label', { class: 'checkbox' }, [
        ui.el('input', { type: 'checkbox', id: 'set-reg', checked: s.allowRegistrations ? 'checked' : null }),
        document.createTextNode(' Allow public self-registration'),
      ]),
      ui.el('button', { type: 'submit', class: 'btn btn-primary', text: 'Save settings' }),
    ]);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const next = { ...data.settings(), siteName: $('#set-name').value.trim(), tagline: $('#set-tag').value.trim(), allowRegistrations: $('#set-reg').checked };
      data.saveSettings(next);
      ui.toast('Settings saved.', 'success');
    });
    card.appendChild(form);
    return card;
  }

  /* ------------------------- shared widgets ------------------------- */
  function setHeader(title, sub) {
    $('#page-title').textContent = title;
    $('#page-sub').textContent = sub || '';
  }
  function statRow(pairs) {
    return ui.el(
      'div',
      { class: 'stat-row' },
      pairs.map(([label, value]) =>
        ui.el('div', { class: 'stat' }, [ui.el('span', { class: 'stat-value', text: String(value) }), ui.el('span', { class: 'stat-label', text: label })])
      )
    );
  }
  function miniStat(label, value, kind) {
    return ui.el('div', { class: 'mini-stat mini-' + kind }, [
      ui.el('span', { class: 'mini-value', text: String(value) }),
      ui.el('span', { class: 'mini-label', text: label }),
    ]);
  }
  function field(label, input) {
    return ui.el('label', { class: 'field' }, [ui.el('span', { class: 'field-label', text: label }), input]);
  }
  function emptyState(text) {
    return ui.el('div', { class: 'empty', text });
  }
  function progressBar(pct) {
    return ui.el('div', { class: 'progress' }, [
      ui.el('div', { class: 'progress-fill', style: 'width:' + pct + '%' }),
      ui.el('span', { class: 'progress-label', text: pct + '%' }),
    ]);
  }
  function buildTable(headers) {
    const thead = ui.el('thead', {}, [ui.el('tr', {}, headers.map((h) => ui.el('th', { text: h })))]);
    const tbody = ui.el('tbody');
    const table = ui.el('table', { class: 'table' }, [thead, tbody]);
    const wrap = ui.el('div', { class: 'table-wrap' }, [table]);
    return { wrap, table, tbody };
  }
  function fileLink(sub) {
    if (!sub.fileData) {
      return ui.el('span', { class: 'file-chip muted' }, [fileIcon(), document.createTextNode(' ' + (sub.fileName || 'file'))]);
    }
    return ui.el('a', { class: 'file-chip', href: sub.fileData, download: sub.fileName, title: 'Download ' + sub.fileName }, [
      fileIcon(),
      document.createTextNode(' ' + sub.fileName),
    ]);
  }
  function fileIcon() {
    const span = ui.el('span', { class: 'file-ic' });
    span.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm0 1.5L18.5 8H14zM8 13h8v1.5H8zm0 3h8v1.5H8z"/></svg>';
    return span;
  }

  /* ================================================================== *
   * router — hash routing + role guards
   * ================================================================== */
  const NAV = {
    [ROLES.ATTACHEE]: [{ hash: '#attachee', label: 'My Attachment', icon: 'home' }],
    [ROLES.SUPERVISOR]: [{ hash: '#supervisor', label: 'Dashboard', icon: 'home' }],
    [ROLES.ADMIN]: [{ hash: '#admin', label: 'Control Panel', icon: 'home' }],
  };

  const router = {
    render() {
      const user = auth.currentUser();
      const hash = location.hash || '';

      // Unauthenticated → always login.
      if (!user) {
        showLogin();
        return;
      }

      const role = auth.detectRole(user);
      const expected = auth.dashboardRoute(role);

      // Role guard: a user may only view their own dashboard.
      if (hash !== expected) {
        location.hash = expected;
        return; // hashchange re-triggers render
      }

      showShell(user, role);
      const content = $('#page-content');
      content.innerHTML = '';
      content.appendChild(pages[role](user));
      notify.renderBell();
      closeSidebar();
    },
  };

  function showLogin() {
    $('#view-login').hidden = false;
    $('#app-shell').hidden = true;
  }

  function showShell(user, role) {
    $('#view-login').hidden = true;
    $('#app-shell').hidden = false;

    // Sidebar identity
    $('#side-user-name').textContent = user.name;
    $('#side-user-role').textContent = role.charAt(0).toUpperCase() + role.slice(1);
    $('#side-avatar').textContent = initials(user.name);

    // Nav links
    const nav = $('#sidebar-nav');
    nav.innerHTML = '';
    (NAV[role] || []).forEach((item) => {
      const a = ui.el('a', { href: item.hash, class: 'nav-link active', text: item.label });
      nav.appendChild(a);
    });
  }

  /* ================================================================== *
   * boot — wire up global listeners
   * ================================================================== */
  function bindLogin() {
    const form = $('#login-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = $('#login-email').value;
      const password = $('#login-password').value;
      const err = $('#login-error');
      const res = auth.login(email, password);
      if (!res.ok) {
        err.textContent = res.error;
        err.hidden = false;
        return;
      }
      err.hidden = true;
      ui.toast('Welcome back, ' + res.user.name.split(' ')[0] + '!', 'success');
      location.hash = auth.dashboardRoute(res.user.role);
      router.render();
    });

    $$('.demo-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $('#login-email').value = chip.dataset.email;
        $('#login-password').value = chip.dataset.password;
      });
    });
  }

  function bindShellChrome() {
    $('#logout-btn').addEventListener('click', () => {
      auth.logout();
      location.hash = '';
      ui.toast('Signed out.', 'info');
      router.render();
    });

    // Sidebar toggle (mobile)
    $('#menu-toggle').addEventListener('click', () => {
      $('#sidebar').classList.toggle('open');
      $('#scrim').hidden = !$('#sidebar').classList.contains('open');
    });
    $('#scrim').addEventListener('click', closeSidebar);

    // Notifications bell
    $('#bell-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = $('#bell-panel');
      panel.hidden = !panel.hidden;
    });
    $('#bell-clear').addEventListener('click', () => {
      const user = auth.currentUser();
      if (user) notify.markAllRead(user.id);
      notify.renderBell();
    });
    document.addEventListener('click', (e) => {
      const wrap = $('.bell-wrap');
      if (wrap && !wrap.contains(e.target)) $('#bell-panel').hidden = true;
    });

    // Modal close
    $$('[data-close="modal"]').forEach((b) => b.addEventListener('click', ui.closeModal));
  }

  function closeSidebar() {
    $('#sidebar').classList.remove('open');
    $('#scrim').hidden = true;
  }

  function boot() {
    seedData();
    bindLogin();
    bindShellChrome();
    window.addEventListener('hashchange', router.render);
    router.render();
  }

  // Expose a tiny API for debugging / future backend swap.
  window.SPH = { db, data, auth, notify, KEYS, ROLES, STATUS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
