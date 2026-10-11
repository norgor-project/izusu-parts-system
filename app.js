// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBo36LBUSqcs1n_gF25X2nSIsZ5zzxDMxk",
  authDomain: "isuzu-parts-system-aed4a.firebaseapp.com",
  databaseURL: "https://isuzu-parts-system-aed4a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "isuzu-parts-system-aed4a",
  storageBucket: "isuzu-parts-system-aed4a.firebasestorage.app",
  messagingSenderId: "994445451333",
  appId: "1:994445451333:web:5d43e8ad7b115ba611832c",
  measurementId: "G-B6R3LW14QH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const PEOPLE = {
    tey: { name: 'พี่เต้ย' },
    som: { name: 'พี่ส้ม' },
    nu: { name: 'พี่หนู' },
    o: { name: 'พี่อิ๋ว' },
    flash: { name: 'พี่แฟลช' },
    oi: { name: 'พี่โอ' },
    bek: { name: 'พี่เบ็ก' },
    chang: { name: 'ช่าง' },
    customer: { name: 'สั่งของลูกค้า' }
};

// In-memory cache for orders
let ordersCache = {
    tey: [],
    som: [],
    nu: [],
    o: [],
    flash: [],
    oi: [],
    bek: [],
    chang: [],
    customer: []
};

let currentPerson = 'tey';
let currentMenu = 'home';
let tempItems = [];
let depositItems = [];
let editingDepositId = null;
let editingItemId = null;
let deadlineAlerts = [];
let noteAlerts = [];
let quickAddBatchId = null; // For quick add to batch

function loadAll() {
    return ordersCache;
}

function saveAll(data) {
    ordersCache = data;
    // Save to Firebase
    database.ref('orders').set(data).catch(function(error) {
        console.error('Error saving to Firebase:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    });
}

function getOrders() {
    return ordersCache[currentPerson] || [];
}

function setOrders(list) {
    ordersCache[currentPerson] = list;
    // Save to Firebase
    database.ref('orders/' + currentPerson).set(list).catch(function(error) {
        console.error('Error saving to Firebase:', error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message);
    });
}

function todayTh() {
    const d = new Date();
    const y = d.getFullYear() + 543;
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + y;
}

function getCurrentTime() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function parseDateTh(dateStr) {
    const parts = dateStr.split('/');
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const y = parseInt(parts[2]) - 543;
    return new Date(y, m, d);
}

function formatDateTh(date) {
    const y = date.getFullYear() + 543;
    return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + y;
}

function getExpectedDeliveryDate(orderDate, orderType) {
    const date = parseDateTh(orderDate);
    if (orderType === 'urgent') {
        date.setDate(date.getDate() + 1);
    } else {
        date.setDate(date.getDate() + 3);
    }
    return formatDateTh(date);
}

function showView(id) {
    // Not used - views are controlled by tab clicks
}

function showMenu(menu) {
    currentMenu = menu;
    ['home', 'add', 'list'].forEach(function (key) {
        const el = document.getElementById('menu-' + key);
        if (key === menu) {
            el.classList.remove('hidden');
            el.classList.remove('fade-in');
            void el.offsetWidth;
            el.classList.add('fade-in');
        } else {
            el.classList.add('hidden');
        }
    });
    document.querySelectorAll('#view-person .tab-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.menu === menu);
    });
    if (menu === 'list') {
        renderTable();
        setTimeout(checkDeliveries, 500);
    }
}

function openPerson(id) {
    try {
        editingItemId = null;
        currentPerson = id;
        const name = PEOPLE[id].name;
        const headerSub = document.getElementById('header-sub');

        // Fade out header sub
        headerSub.classList.add('fade');

        setTimeout(function() {
            headerSub.textContent = 'กำลังใช้งานเมนูของ ' + name;
            headerSub.classList.remove('fade');
        }, 150);

        document.querySelectorAll('.person-name').forEach(function (el) {
            el.textContent = name;
        });
        document.getElementById('search-box').placeholder = 'ค้นหารายการของ' + name + '...';
        // Reset form fields manually
        document.getElementById('edit-id').value = '';
        document.getElementById('temp-part-no').value = '';
        document.getElementById('temp-part-no-hidden').value = '';
        document.getElementById('temp-part-name').value = '';
        document.getElementById('temp-qty').value = 1;
        document.getElementById('temp-item-note').value = '';
        document.getElementById('order-type').value = 'normal';
        document.getElementById('license-plate').value = '';
        document.getElementById('note').value = '';
        tempItems = [];

        // Reset PIN boxes
        const boxes = document.querySelectorAll('.pin-box-small');
        if (boxes.length > 0) {
            boxes.forEach(function (box) {
                box.textContent = '';
                box.classList.remove('filled', 'active');
            });
            boxes[0].classList.add('active');
        }

        renderTempItems();
        updatePersonTabs();

        // Show person view, hide other views
        document.getElementById('view-search-all').classList.add('hidden');
        document.getElementById('view-notes').classList.add('hidden');
        document.getElementById('view-alerts').classList.add('hidden');
        document.getElementById('view-due-alerts').classList.add('hidden');
        document.getElementById('view-deposit').classList.add('hidden');
        const viewCal = document.getElementById('view-calendar');
        if (viewCal) viewCal.classList.add('hidden');
        document.getElementById('view-person').classList.remove('hidden');

        // Add animation to logo
        const logoBox = document.querySelector('.logo-box');
        logoBox.classList.remove('pulse');
        void logoBox.offsetWidth;
        logoBox.classList.add('pulse');

        // Add animation to content
        const viewPerson = document.getElementById('view-person');
        viewPerson.classList.remove('slide-in');
        void viewPerson.offsetWidth;
        viewPerson.classList.add('slide-in');

        showMenu('add');

        // Focus on part number input
        setTimeout(function() {
            document.getElementById('temp-part-no-hidden').focus();
        }, 300);
    } catch (e) {
        console.error('Error in openPerson:', e);
    }
}

function showSearchAll() {
    currentPerson = 'search-all';
    const headerSub = document.getElementById('header-sub');

    headerSub.classList.add('fade');

    setTimeout(function() {
        headerSub.textContent = 'ค้นหาหมายเลขอะไหล่ทั้งหมด';
        headerSub.classList.remove('fade');
    }, 150);

    updatePersonTabs();

    // Show search all view, hide other views
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-notes').classList.add('hidden');
    document.getElementById('view-alerts').classList.add('hidden');
    document.getElementById('view-due-alerts').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
    const viewCal = document.getElementById('view-calendar');
    if (viewCal) viewCal.classList.add('hidden');
    document.getElementById('view-search-all').classList.remove('hidden');
    renderSearchAll();

    // Add animation to logo
    const logoBox = document.querySelector('.logo-box');
    logoBox.classList.remove('pulse');
    void logoBox.offsetWidth;
    logoBox.classList.add('pulse');
}

function showNotes() {
    currentPerson = 'notes';
    const headerSub = document.getElementById('header-sub');

    headerSub.classList.add('fade');

    setTimeout(function() {
        headerSub.textContent = 'สมุดบันทึกโน๊ต & การแจ้งเตือน';
        headerSub.classList.remove('fade');
    }, 150);

    updatePersonTabs();

    // Show notes view, hide other views
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.add('hidden');
    document.getElementById('view-alerts').classList.add('hidden');
    document.getElementById('view-due-alerts').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
    const viewCal = document.getElementById('view-calendar');
    if (viewCal) viewCal.classList.add('hidden');
    document.getElementById('view-notes').classList.remove('hidden');

    // Load notes from Firebase
    loadNotes();

    // Add animation to logo
    const logoBox = document.querySelector('.logo-box');
    logoBox.classList.remove('pulse');
    void logoBox.offsetWidth;
    logoBox.classList.add('pulse');
}

function showAlerts() {
    currentPerson = 'alerts';
    const headerSub = document.getElementById('header-sub');

    headerSub.classList.add('fade');

    setTimeout(function() {
        headerSub.textContent = 'รายการที่มาส่งแล้ว';
        headerSub.classList.remove('fade');
    }, 150);

    updatePersonTabs();

    // Show alerts view, hide other views
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.add('hidden');
    document.getElementById('view-notes').classList.add('hidden');
    document.getElementById('view-due-alerts').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
    const viewCal = document.getElementById('view-calendar');
    if (viewCal) viewCal.classList.add('hidden');
    document.getElementById('view-alerts').classList.remove('hidden');

    // Load received items from Firebase
    loadAlerts();

    // Add animation to logo
    const logoBox = document.querySelector('.logo-box');
    logoBox.classList.remove('pulse');
    void logoBox.offsetWidth;
    logoBox.classList.add('pulse');
}

function showDeposit() {
    currentPerson = 'deposit';
    const headerSub = document.getElementById('header-sub');

    headerSub.classList.add('fade');

    setTimeout(function() {
        headerSub.textContent = 'รายการมัดจำ';
        headerSub.classList.remove('fade');
    }, 150);

    updatePersonTabs();

    // Show deposit view, hide other views
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.add('hidden');
    document.getElementById('view-notes').classList.add('hidden');
    document.getElementById('view-alerts').classList.add('hidden');
    document.getElementById('view-due-alerts').classList.add('hidden');
    const viewCal = document.getElementById('view-calendar');
    if (viewCal) viewCal.classList.add('hidden');
    document.getElementById('view-deposit').classList.remove('hidden');

    // Reset to new tab
    document.getElementById('deposit-tab-new').classList.remove('hidden');
    document.getElementById('deposit-tab-history').classList.add('hidden');
    document.querySelectorAll('[data-deposit-tab]').forEach(function (t) {
        t.classList.toggle('active', t.dataset.depositTab === 'new');
    });

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('deposit-order-date').value = today;

    // Load deposits from Firebase
    loadDeposits();

    // Add animation to logo
    const logoBox = document.querySelector('.logo-box');
    logoBox.classList.remove('pulse');
    void logoBox.offsetWidth;
    logoBox.classList.add('pulse');
}

function showDueAlerts() {
    currentPerson = 'due-alerts';
    const headerSub = document.getElementById('header-sub');

    headerSub.classList.add('fade');

    setTimeout(function() {
        headerSub.textContent = 'รายการอะไหล่ที่ครบกำหนดวันแล้ว';
        headerSub.classList.remove('fade');
    }, 150);

    updatePersonTabs();

    // Show due alerts view, hide other views
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.add('hidden');
    document.getElementById('view-notes').classList.add('hidden');
    document.getElementById('view-alerts').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
    const viewCal = document.getElementById('view-calendar');
    if (viewCal) viewCal.classList.add('hidden');
    document.getElementById('view-due-alerts').classList.remove('hidden');

    // Load due items
    loadDueAlerts();

    // Add animation to logo
    const logoBox = document.querySelector('.logo-box');
    logoBox.classList.remove('pulse');
    void logoBox.offsetWidth;
    logoBox.classList.add('pulse');
}

function showCalendar() {
    currentPerson = 'calendar';
    const headerSub = document.getElementById('header-sub');

    headerSub.classList.add('fade');

    setTimeout(function() {
        headerSub.textContent = 'ปฏิทินงาน & วันหยุดนักขัตฤกษ์';
        headerSub.classList.remove('fade');
    }, 150);

    updatePersonTabs();

    // Show calendar view, hide other views
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.add('hidden');
    document.getElementById('view-notes').classList.add('hidden');
    document.getElementById('view-alerts').classList.add('hidden');
    document.getElementById('view-due-alerts').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
    const viewCal = document.getElementById('view-calendar');
    if (viewCal) viewCal.classList.remove('hidden');

    // Init and render calendar
    if (typeof initCalendarView === 'function') {
        initCalendarView();
    } else {
        renderCalendar();
    }

    // Add animation to logo
    const logoBox = document.querySelector('.logo-box');
    if (logoBox) {
        logoBox.classList.remove('pulse');
        void logoBox.offsetWidth;
        logoBox.classList.add('pulse');
    }
}

function loadAlerts() {
    database.ref('orders').once('value').then(function (snapshot) {
        const all = snapshot.val();
        const container = document.getElementById('alerts-container');
        const empty = document.getElementById('alerts-empty');
        container.innerHTML = '';
        container.appendChild(empty);

        if (!all) {
            empty.classList.remove('hidden');
            return;
        }

        // Get all received items
        const receivedItems = [];
        Object.keys(all).forEach(function (personId) {
            all[personId].forEach(function (item) {
                if (item.received) {
                    receivedItems.push({
                        ...item,
                        personId: personId,
                        personName: PEOPLE[personId].name
                    });
                }
            });
        });

        if (receivedItems.length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        // Group by batchId
        const grouped = {};
        receivedItems.forEach(function (item) {
            if (!grouped[item.batchId]) {
                grouped[item.batchId] = {
                    personName: item.personName,
                    personId: item.personId,
                    date: item.date,
                    time: item.time,
                    type: item.type,
                    licensePlate: item.licensePlate,
                    note: item.note,
                    items: []
                };
            }
            grouped[item.batchId].items.push(item);
        });

        // Group by person and date
        const groupedByPersonDate = {};
        receivedItems.forEach(function (item) {
            const key = item.personId + '|' + item.date;
            if (!groupedByPersonDate[key]) {
                groupedByPersonDate[key] = {
                    personName: item.personName,
                    personId: item.personId,
                    date: item.date,
                    time: item.time,
                    licensePlate: item.licensePlate,
                    note: item.note,
                    items: []
                };
            }
            groupedByPersonDate[key].items.push(item);
        });

        Object.values(groupedByPersonDate).forEach(function (group) {
            const totalQty = group.items.reduce(function (sum, item) {
                return sum + item.qty;
            }, 0);

            // Create group card
            const groupCard = document.createElement('div');
            groupCard.className = 'card-custom p-0 mb-4 alert-group-card';

            // Group header
            const header = document.createElement('div');
            header.className = 'alert-group-header';
            header.innerHTML =
                '<div class="alert-header-row">' +
                '<div class="alert-header-info">' +
                '<div class="alert-person-name">' +
                '<i class="fa-solid fa-user me-2"></i>' +
                escapeHtml(group.personName) +
                '</div>' +
                '<div class="alert-date-time">' +
                '<i class="fa-solid fa-calendar me-1"></i>' +
                group.date + ' ' + group.time +
                (group.licensePlate ? ' <span class="ms-2"><i class="fa-solid fa-car me-1"></i>' + escapeHtml(group.licensePlate) + '</span>' : '') +
                '</div>' +
                (group.note ? '<div class="alert-note">' +
                '<i class="fa-solid fa-note-sticky me-1"></i>' +
                escapeHtml(group.note) +
                '</div>' : '') +
                '</div>' +
                '<div class="alert-header-summary">' +
                group.items.length + ' รายการ (' + totalQty + ' ชิ้น)' +
                '</div>' +
                '</div>';
            groupCard.appendChild(header);

            // Items table
            const table = document.createElement('table');
            table.className = 'table table-sm align-middle mb-0 alert-table';
            table.innerHTML =
                '<thead>' +
                '<tr class="custom-table-header">' +
                '<th class="py-2 ps-3" style="width: 50px;">#</th>' +
                '<th class="py-2">หมายเลขอะไหล่</th>' +
                '<th class="py-2">ชื่ออะไหล่</th>' +
                '<th class="py-2 text-center">จำนวน</th>' +
                '<th class="py-2">หมายเหตุอะไหล่</th>' +
                '<th class="py-2 text-center">จัดการ</th>' +
                '</tr>' +
                '</thead>' +
                '<tbody>';

            group.items.forEach(function (item, index) {
                table.innerHTML +=
                    '<tr>' +
                    '<td class="ps-3 fw-medium">' + (index + 1) + '</td>' +
                    '<td class="alert-part-no">' + escapeHtml(item.partNo) + '</td>' +
                    '<td class="alert-part-name">' + escapeHtml(item.partName || '-') + '</td>' +
                    '<td class="text-center alert-qty">' + item.qty + '</td>' +
                    '<td class="text-muted small">' + escapeHtml(item.itemNote || '-') + '</td>' +
                    '<td class="text-center">' +
                    '<button class="btn btn-sm btn-success alert-action-btn" data-confirm-batch="' + item.batchId + '" data-person="' + group.personId + '">' +
                    '<i class="fa-solid fa-check me-1"></i> รับแล้ว' +
                    '</button>' +
                    '</td>' +
                    '</tr>';
            });

            table.innerHTML += '</tbody>';
            groupCard.appendChild(table);
            container.appendChild(groupCard);
        });
    }).catch(function (error) {
        console.error('Error loading alerts:', error);
    });
}

function confirmReceivedBatch(batchId, personId) {
    if (!confirm('ยืนยันว่ารับของแล้วและลบรายการนี้?')) return;

    database.ref('orders/' + personId).once('value').then(function (snapshot) {
        const list = snapshot.val() || [];
        const filtered = list.filter(function (x) { return x.batchId !== batchId; });
        database.ref('orders/' + personId).set(filtered).then(function () {
            loadAlerts();
        }).catch(function (error) {
            console.error('Error deleting batch:', error);
            alert('เกิดข้อผิดพลาดในการลบรายการ: ' + error.message);
        });
    }).catch(function (error) {
        console.error('Error loading orders:', error);
    });
}

let currentNoteFilter = 'all';
let noteSearchQuery = '';
let currentNotesCache = [];

function renderNotesList() {
    const container = document.getElementById('notes-container');
    const empty = document.getElementById('notes-empty');
    if (!container) return;

    // Remove existing note cards (keep the empty element)
    const cards = container.querySelectorAll('.note-item-card');
    cards.forEach(card => card.remove());

    // Update Quick Stats counters
    const totalCount = currentNotesCache.length;
    let pendingCount = 0;
    let doneCount = 0;

    currentNotesCache.forEach(function (note) {
        if (note.alertDate && note.alertTime) {
            if (note.alerted) {
                doneCount++;
            } else {
                pendingCount++;
            }
        }
    });

    const totalEl = document.getElementById('notes-total-count');
    const pendingEl = document.getElementById('notes-pending-count');
    const doneEl = document.getElementById('notes-done-count');
    if (totalEl) totalEl.textContent = totalCount;
    if (pendingEl) pendingEl.textContent = pendingCount;
    if (doneEl) doneEl.textContent = doneCount;

    // Filter notes
    const filtered = currentNotesCache.filter(function (note) {
        // Search query filter
        if (noteSearchQuery) {
            const q = noteSearchQuery.toLowerCase();
            const textMatch = (note.text || '').toLowerCase().includes(q);
            const dateMatch = (note.date || '').includes(q);
            const alertDateMatch = (note.alertDate || '').includes(q);
            if (!textMatch && !dateMatch && !alertDateMatch) return false;
        }

        // Category filter
        if (currentNoteFilter === 'alert') {
            return !!(note.alertDate && note.alertTime);
        } else if (currentNoteFilter === 'general') {
            return !(note.alertDate && note.alertTime);
        }
        return true;
    });

    if (filtered.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }

    if (empty) empty.classList.add('hidden');

    filtered.forEach(function (note) {
        const card = document.createElement('div');
        const hasAlert = !!(note.alertDate && note.alertTime);
        const isAlerted = !!note.alerted;

        let statusClass = 'general-note';
        if (hasAlert) {
            statusClass = isAlerted ? 'alert-done' : 'has-alert';
        }

        card.className = 'note-item-card ' + statusClass;

        let alertBadgeHtml = '';
        if (hasAlert) {
            if (isAlerted) {
                alertBadgeHtml = '<span class="note-badge-alert-done"><i class="fa-solid fa-check-double"></i> แจ้งเตือนแล้ว (' + escapeHtml(note.alertDate) + ' ' + escapeHtml(note.alertTime) + ')</span>';
            } else {
                alertBadgeHtml = '<span class="note-badge-alert-pending"><i class="fa-solid fa-bell"></i> แจ้งเตือน ' + escapeHtml(note.alertDate) + ' ' + escapeHtml(note.alertTime) + '</span>';
            }
        }

        card.innerHTML =
            '<div class="d-flex justify-content-between align-items-center mb-2">' +
                '<div class="note-item-meta">' +
                    '<i class="fa-regular fa-calendar-check me-1"></i>' +
                    '<span>' + escapeHtml(note.date || '') + ' ' + escapeHtml(note.time || '') + '</span>' +
                '</div>' +
                '<div class="d-flex gap-1">' +
                    '<button type="button" class="btn-note-action" data-edit-note="' + note.id + '" title="แก้ไขโน๊ต">' +
                        '<i class="fa-solid fa-pen-to-square"></i>' +
                    '</button>' +
                    '<button type="button" class="btn-note-action btn-delete" data-delete-note="' + note.id + '" title="ลบโน๊ต">' +
                        '<i class="fa-solid fa-trash-can"></i>' +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<div class="note-item-content">' + escapeHtml(note.text || '') + '</div>' +
            (alertBadgeHtml ? '<div class="mt-2 pt-2 border-top d-flex justify-content-start">' + alertBadgeHtml + '</div>' : '');

        container.appendChild(card);
    });
}

function loadNotes() {
    database.ref('notes').on('value', function (snapshot) {
        const notes = snapshot.val();
        if (!notes) {
            currentNotesCache = [];
        } else {
            // Sort by most recent first
            currentNotesCache = Object.values(notes).reverse();
        }
        renderNotesList();
    });
}

function addNote() {
    const text = document.getElementById('note-input').value.trim();
    if (!text) {
        alert('กรุณาพิมพ์โน๊ต');
        return;
    }

    const alertDate = document.getElementById('note-alert-date').value;
    const alertTime = document.getElementById('note-alert-time').value;

    const noteId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
    const note = {
        id: noteId,
        text: text,
        date: todayTh(),
        time: getCurrentTime(),
        alertDate: alertDate || null,
        alertTime: alertTime || null,
        alerted: false
    };

    database.ref('notes/' + noteId).set(note).then(function () {
        document.getElementById('note-input').value = '';
        document.getElementById('note-alert-date').value = '';
        document.getElementById('note-alert-time').value = '';
    }).catch(function (error) {
        console.error('Error adding note:', error);
        alert('เกิดข้อผิดพลาดในการเพิ่มโน๊ต: ' + error.message);
    });
}

function deleteNote(noteId) {
    if (!confirm('ลบโน๊ตนี้หรือไม่?')) return;

    database.ref('notes/' + noteId).remove().then(function () {
        // Note removed successfully
    }).catch(function (error) {
        console.error('Error deleting note:', error);
        alert('เกิดข้อผิดพลาดในการลบโน๊ต: ' + error.message);
    });
}

function editNote(noteId) {
    database.ref('notes/' + noteId).once('value').then(function (snapshot) {
        const note = snapshot.val();
        if (!note) return;

        const newText = prompt('แก้ไขโน๊ต:', note.text);
        if (newText === null) return; // User cancelled

        if (newText.trim()) {
            const updateData = {
                text: newText.trim(),
                date: todayTh(),
                time: getCurrentTime()
            };

            // Ask if user wants to change alert time
            const changeAlert = confirm('ต้องการเปลี่ยนเวลาแจ้งเตือนหรือไม่?');
            if (changeAlert) {
                const newAlertDate = prompt('วันที่แจ้งเตือน (YYYY-MM-DD):', note.alertDate || '');
                const newAlertTime = prompt('เวลาแจ้งเตือน (HH:MM):', note.alertTime || '');

                if (newAlertDate !== null && newAlertTime !== null) {
                    updateData.alertDate = newAlertDate.trim() || null;
                    updateData.alertTime = newAlertTime.trim() || null;
                    updateData.alerted = false;
                }
            }

            database.ref('notes/' + noteId).update(updateData).catch(function (error) {
                console.error('Error updating note:', error);
                alert('เกิดข้อผิดพลาดในการแก้ไขโน๊ต: ' + error.message);
            });
        }
    }).catch(function (error) {
        console.error('Error loading note:', error);
    });
}

function renderTable() {
    const q = document.getElementById('search-box').value.trim().toLowerCase();
    const rows = getOrders().filter(function (item) {
        const blob = [item.partNo, item.partName, item.note, item.date].join(' ').toLowerCase();
        return !q || blob.indexOf(q) !== -1;
    });
    const container = document.getElementById('order-list-container');
    const empty = document.getElementById('empty-state');
    container.innerHTML = '';
    container.appendChild(empty);

    if (!rows.length) {
        empty.classList.remove('hidden');
        empty.textContent = q
            ? 'ไม่พบรายการที่ค้นหาในเมนูของ' + PEOPLE[currentPerson].name
            : 'ยังไม่มีรายการสั่งอะไหล่ของ' + PEOPLE[currentPerson].name;
        return;
    }
    empty.classList.add('hidden');

    // Group by batchId
    const grouped = {};
    rows.forEach(function (item) {
        if (!grouped[item.batchId]) {
            grouped[item.batchId] = {
                date: item.date,
                time: item.time,
                type: item.type,
                licensePlate: item.licensePlate,
                note: item.note,
                items: []
            };
        }
        grouped[item.batchId].items.push(item);
    });

    Object.values(grouped).forEach(function (group) {
        // Calculate total quantity & delivery status in this group
        const totalQty = group.items.reduce(function (sum, item) {
            return sum + item.qty;
        }, 0);
        const receivedCount = group.items.filter(function (item) {
            return item.received;
        }).length;
        const allReceived = group.items.length > 0 && receivedCount === group.items.length;
        const expectedDate = getExpectedDeliveryDate(group.date, group.type);
        const isUrgent = group.type === 'urgent';

        // Create group box container
        const groupBox = document.createElement('div');
        groupBox.className = 'order-group-card ' + (isUrgent ? 'border-urgent' : 'border-normal') + (allReceived ? ' all-received' : '');

        // Group header
        const header = document.createElement('div');
        header.className = 'order-group-header';
        header.innerHTML =
            '<div class="order-group-header-top">' +
                '<div class="order-group-title-area">' +
                    '<div class="order-group-title">' +
                        '<i class="fa-solid fa-calendar-days text-primary"></i>' +
                        '<span class="order-date-text">' + group.date + '</span>' +
                        '<span class="order-time-text"><i class="fa-regular fa-clock me-1"></i>' + group.time + '</span>' +
                    '</div>' +
                    '<div class="order-group-tags">' +
                        (isUrgent
                            ? '<span class="order-tag-urgent"><i class="fa-solid fa-bolt me-1"></i>สั่งด่วน</span>'
                            : '<span class="order-tag-normal"><i class="fa-solid fa-truck me-1"></i>สั่งปกติ</span>') +
                        '<span class="order-tag-expected" title="วันที่คาดว่าจะได้รับของ"><i class="fa-solid fa-calendar-check me-1"></i>กำหนดส่ง: ' + expectedDate + '</span>' +
                        (group.licensePlate
                            ? '<span class="order-tag-plate"><i class="fa-solid fa-car-side me-1"></i>' + escapeHtml(group.licensePlate) + '</span>'
                            : '') +
                        (allReceived
                            ? '<span class="order-tag-completed"><i class="fa-solid fa-circle-check me-1"></i>รับครบแล้ว</span>'
                            : (receivedCount > 0
                                ? '<span class="order-tag-partial"><i class="fa-solid fa-hourglass-half me-1"></i>รับแล้ว ' + receivedCount + '/' + group.items.length + '</span>'
                                : '')) +
                    '</div>' +
                '</div>' +
                '<div class="order-group-actions-area">' +
                    '<span class="order-group-count-badge">' +
                        '<i class="fa-solid fa-boxes-stacked me-1"></i>' + group.items.length + ' รายการ <span class="badge-qty-sep">•</span> ' + totalQty + ' ชิ้น' +
                    '</span>' +
                    '<div class="order-group-btn-group">' +
                        '<button type="button" class="btn-group-action btn-group-add" data-add-to-batch="' + group.items[0].batchId + '" title="เพิ่มรายการอะไหล่ในชุดนี้">' +
                            '<i class="fa-solid fa-plus me-1"></i>เพิ่มอะไหล่' +
                        '</button>' +
                        '<button type="button" class="btn-group-action btn-group-print" data-print-batch="' + group.items[0].batchId + '" title="พิมพ์ใบสั่งอะไหล่">' +
                            '<i class="fa-solid fa-print me-1"></i>พิมพ์' +
                        '</button>' +
                        '<button type="button" class="btn-group-action btn-group-edit" data-edit-batch="' + group.items[0].batchId + '" title="แก้ไขข้อมูลชุดนี้">' +
                            '<i class="fa-solid fa-pen-to-square"></i>' +
                        '</button>' +
                        '<button type="button" class="btn-group-action btn-group-delete" data-delete-batch="' + group.items[0].batchId + '" title="ลบทั้งชุดนี้">' +
                            '<i class="fa-solid fa-trash-can"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            (group.note ? '<div class="order-group-note-banner"><i class="fa-solid fa-comment-dots text-primary me-2"></i><span class="note-label">หมายเหตุชุด:</span> ' + escapeHtml(group.note) + '</div>' : '');

        groupBox.appendChild(header);

        // Items table
        const tableResponsive = document.createElement('div');
        tableResponsive.className = 'table-responsive';

        const table = document.createElement('table');
        table.className = 'table table-sm align-middle mb-0 order-table';
        table.innerHTML =
            '<thead>' +
            '<tr class="custom-table-header">' +
            '<th class="py-2 ps-3" style="width: 45px;">#</th>' +
            '<th class="py-2">หมายเลขอะไหล่</th>' +
            '<th class="py-2">ชื่ออะไหล่</th>' +
            '<th class="py-2 text-center" style="width: 85px;">จำนวน</th>' +
            '<th class="py-2">หมายเหตุอะไหล่</th>' +
            '<th class="py-2 text-center" style="width: 140px;">สถานะ</th>' +
            '<th class="py-2 text-center" style="width: 125px;">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody></tbody>';
        const tbody = table.querySelector('tbody');

        // Add items in this batch
        group.items.forEach(function (item, index) {
            const tr = document.createElement('tr');
            const expectedItemDate = getExpectedDeliveryDate(item.date, item.type);
            const isReceived = item.received;
            const statusBadge = isReceived
                ? '<span class="status-badge-received"><i class="fa-solid fa-check me-1"></i>มาส่งแล้ว</span>'
                : '<span class="status-badge-waiting"><i class="fa-solid fa-clock me-1"></i>รอของ (' + expectedItemDate + ')</span>';

            if (item.id === editingItemId) {
                tr.className = 'table-light align-middle inline-edit-row';
                tr.innerHTML =
                    '<td class="ps-3 fw-medium text-muted">' + (index + 1) + '</td>' +
                    '<td><input type="text" class="form-control form-control-sm fw-bold text-primary inline-edit-part-no" data-id="' + item.id + '" value="' + escapeHtml(item.partNo) + '" maxlength="10" placeholder="เลขอะไหล่ 10 หลัก" style="min-width: 130px;"></td>' +
                    '<td><input type="text" class="form-control form-control-sm inline-edit-part-name" data-id="' + item.id + '" value="' + escapeHtml(item.partName || '') + '" placeholder="ชื่ออะไหล่" style="min-width: 140px;"></td>' +
                    '<td class="text-center"><input type="number" class="form-control form-control-sm text-center mx-auto inline-edit-qty" data-id="' + item.id + '" value="' + item.qty + '" min="1" style="max-width: 75px;"></td>' +
                    '<td><input type="text" class="form-control form-control-sm inline-edit-note" data-id="' + item.id + '" value="' + escapeHtml(item.itemNote || '') + '" placeholder="หมายเหตุอะไหล่" style="min-width: 120px;"></td>' +
                    '<td class="text-center">' + statusBadge + '</td>' +
                    '<td class="text-center text-nowrap">' +
                    '<button class="btn btn-success btn-sm me-1 px-2 py-1" data-save-inline="' + item.id + '" title="บันทึกการแก้ไข"><i class="fa-solid fa-check me-1"></i>บันทึก</button>' +
                    '<button class="btn btn-outline-secondary btn-sm px-2 py-1" data-cancel-inline="' + item.id + '" title="ยกเลิก"><i class="fa-solid fa-xmark"></i></button>' +
                    '</td>';
            } else {
                tr.className = isReceived ? 'row-received' : '';
                tr.innerHTML =
                    '<td class="ps-3"><span class="row-index-circle">' + (index + 1) + '</span></td>' +
                    '<td><span class="part-no-pill">' + escapeHtml(item.partNo) + '</span></td>' +
                    '<td class="fw-medium text-dark">' + escapeHtml(item.partName || '-') + '</td>' +
                    '<td class="text-center"><span class="qty-pill">' + item.qty + '</span></td>' +
                    '<td>' + (item.itemNote ? '<span class="item-note-text"><i class="fa-solid fa-tag me-1 text-muted"></i>' + escapeHtml(item.itemNote) + '</span>' : '<span class="text-muted small">-</span>') + '</td>' +
                    '<td class="text-center">' + statusBadge + '</td>' +
                    '<td class="text-center">' +
                    '<div class="btn-group-row-actions">' +
                    '<button class="btn-row-action ' + (isReceived ? 'btn-row-uncheck' : 'btn-row-check') + '" data-receive="' + item.id + '" title="' + (isReceived ? 'ยกเลิกสถานะมาส่งแล้ว' : 'ทำเครื่องหมายว่ามาส่งแล้ว') + '"><i class="fa-solid fa-check"></i></button>' +
                    '<button class="btn-row-action btn-row-edit" data-edit="' + item.id + '" title="แก้ไขรายการอะไหล่"><i class="fa-solid fa-pen"></i></button>' +
                    '<button class="btn-row-action btn-row-del" data-del="' + item.id + '" title="ลบรายการนี้"><i class="fa-solid fa-trash"></i></button>' +
                    '</div>' +
                    '</td>';
            }
            tbody.appendChild(tr);
        });

        tableResponsive.appendChild(table);
        groupBox.appendChild(tableResponsive);
        container.appendChild(groupBox);
    });

    if (editingItemId) {
        const activeInput = container.querySelector('.inline-edit-part-no[data-id="' + editingItemId + '"]');
        if (activeInput) {
            activeInput.focus();
            activeInput.select();
        }
    }
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
}

function printBatch(batchId) {
    const list = getOrders();
    const batchItems = list.filter(function (x) { return x.batchId === batchId; });
    if (batchItems.length === 0) return;

    const group = {
        date: batchItems[0].date,
        time: batchItems[0].time,
        type: batchItems[0].type,
        licensePlate: batchItems[0].licensePlate,
        note: batchItems[0].note,
        items: batchItems
    };

    // Determine the person name accurately
    const personName = (batchItems[0].personName) || 
                       (batchItems[0].person && PEOPLE[batchItems[0].person] && PEOPLE[batchItems[0].person].name) || 
                       (PEOPLE[currentPerson] ? PEOPLE[currentPerson].name : 'ทั่วไป');

    const totalQty = group.items.reduce(function (sum, item) {
        return sum + (Number(item.qty) || 0);
    }, 0);

    const printDateTh = todayTh();
    const printTime = getCurrentTime();
    const isUrgent = group.type === 'urgent';

    // Create print HTML
    let printHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
    printHTML += '<title></title>';
    printHTML += '<style>';
    printHTML += '@import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800;900&display=swap");';
    printHTML += '@page { size: A4 portrait; margin: 0; }';
    printHTML += '* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    printHTML += 'html, body { margin: 0; padding: 0; background-color: #fff; }';
    printHTML += 'body { font-family: "Sarabun", "Tahoma", sans-serif; color: #000; line-height: 1.45; font-size: 13.5px; }';
    printHTML += '.doc-container { width: 100%; max-width: 100%; margin: 0 auto; padding: 12mm 15mm 12mm 15mm; background: #fff; }';
    
    // Header Table
    printHTML += '.header-table { width: 100%; border-collapse: collapse; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 14px; }';
    printHTML += '.header-title { font-size: 24px; font-weight: 800; color: #000; margin: 0; }';
    printHTML += '.header-meta { text-align: right; font-size: 12.5px; color: #000; vertical-align: bottom; white-space: nowrap; }';
    
    // Requester Hero Card (Focus on WHOSE ORDER)
    printHTML += '.requester-card { border: 2.5px solid #000; border-radius: 10px; background: #f8fafc; padding: 14px 20px; margin-bottom: 14px; }';
    printHTML += '.requester-table { width: 100%; border-collapse: collapse; }';
    printHTML += '.requester-label { font-size: 13px; font-weight: 700; color: #475569; letter-spacing: 0.5px; margin-bottom: 4px; }';
    printHTML += '.requester-name { font-size: 30px; font-weight: 900; color: #000000; letter-spacing: 0.5px; line-height: 1.15; }';
    printHTML += '.order-type-badge { display: inline-block; padding: 6px 16px; border-radius: 8px; font-size: 15px; font-weight: 800; text-align: center; letter-spacing: 0.5px; }';
    printHTML += '.type-urgent { background: #fef2f2; color: #dc2626; border: 2px solid #dc2626; }';
    printHTML += '.type-normal { background: #f0fdf4; color: #166534; border: 2px solid #16a34a; }';

    // Order Info Card
    printHTML += '.info-card { border: 1.5px solid #000; border-radius: 8px; background: #fff; padding: 10px 16px; margin-bottom: 16px; }';
    printHTML += '.info-grid { width: 100%; border-collapse: collapse; }';
    printHTML += '.info-grid td { padding: 5px 8px; vertical-align: middle; font-size: 13.5px; color: #000; }';
    printHTML += '.info-label { font-weight: bold; color: #000; white-space: nowrap; width: 1%; padding-right: 8px; }';
    printHTML += '.info-val { font-weight: bold; color: #000; }';
    printHTML += '.plate-badge { display: inline-block; background: #fff; color: #000; font-weight: 800; padding: 2px 10px; border-radius: 6px; border: 1.5px solid #000; font-size: 13.5px; letter-spacing: 0.5px; }';

    // Items Table (Rounded container & Full Grid Dividers)
    printHTML += '.table-container { border: 1.5px solid #000; border-radius: 8px; overflow: hidden; margin-bottom: 16px; background: #fff; }';
    printHTML += '.items-table { width: 100%; border-collapse: collapse; margin: 0; }';
    printHTML += '.items-table th, .items-table td { border: 1px solid #000; }';
    printHTML += '.items-table th { background: #e2e8f0; color: #000000 !important; font-weight: 800 !important; font-size: 16px; padding: 11px 10px; text-align: center; border-bottom: 2px solid #000; }';
    printHTML += '.items-table td { padding: 11px 12px; color: #000; vertical-align: middle; }';

    // Summary Box
    printHTML += '.summary-container { border: 1.5px solid #000; border-radius: 8px; overflow: hidden; background: #f8fafc; padding: 12px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }';
    printHTML += '.summary-text { font-size: 16px; font-weight: bold; color: #000; }';
    printHTML += '.summary-qty { font-size: 18px; font-weight: 900; color: #000; }';
    printHTML += '</style>';
    printHTML += '</head><body>';

    printHTML += '<div class="doc-container">';

    // Header Table (Clean & Official)
    printHTML += '<table class="header-table">';
    printHTML += '<tr>';
    printHTML += '<td style="vertical-align: bottom;">';
    printHTML += '<div class="header-title">ใบสั่งอะไหล่</div>';
    printHTML += '</td>';
    printHTML += '<td class="header-meta">';
    printHTML += 'พิมพ์เมื่อ: <strong style="color: #000;">' + printDateTh + ' ' + printTime + '</strong>';
    printHTML += '</td>';
    printHTML += '</tr>';
    printHTML += '</table>';

    // Requester Hero Card (FOCUSED ON WHOSE ORDER)
    printHTML += '<div class="requester-card">';
    printHTML += '<table class="requester-table">';
    printHTML += '<tr>';
    printHTML += '<td>';
    printHTML += '<div class="requester-label">รายการสั่งอะไหล่ของ:</div>';
    printHTML += '<div class="requester-name">' + escapeHtml(personName) + '</div>';
    printHTML += '</td>';
    printHTML += '<td style="text-align: right; vertical-align: middle; width: 35%;"> ';
    if (isUrgent) {
        printHTML += '<div class="order-type-badge type-urgent">⚡ สั่งด่วน</div>';
    } else {
        printHTML += '<div class="order-type-badge type-normal">📦 สั่งปกติ</div>';
    }
    printHTML += '</td>';
    printHTML += '</tr>';
    printHTML += '</table>';
    printHTML += '</div>';

    // Order Meta Info Card
    printHTML += '<div class="info-card">';
    printHTML += '<table class="info-grid">';
    printHTML += '<tr>';
    printHTML += '<td class="info-label">วันที่สั่ง:</td>';
    printHTML += '<td class="info-val">' + escapeHtml(group.date || '-') + '</td>';
    printHTML += '<td class="info-label" style="padding-left: 20px;">เวลาที่สั่ง:</td>';
    printHTML += '<td class="info-val">' + escapeHtml(group.time || '-') + ' น.</td>';
    if (group.licensePlate) {
        printHTML += '<td class="info-label" style="padding-left: 20px;">ทะเบียนรถ:</td>';
        printHTML += '<td class="info-val"><span class="plate-badge">' + escapeHtml(group.licensePlate) + '</span></td>';
    }
    printHTML += '</tr>';
    if (group.note) {
        printHTML += '<tr>';
        printHTML += '<td class="info-label">หมายเหตุชุด:</td>';
        printHTML += '<td class="info-val" colspan="' + (group.licensePlate ? '5' : '3') + '" style="color: #000;">' + escapeHtml(group.note) + '</td>';
        printHTML += '</tr>';
    }
    printHTML += '</table>';
    printHTML += '</div>';

    // Items Table
    printHTML += '<div class="table-container">';
    printHTML += '<table class="items-table">';
    printHTML += '<thead><tr>';
    printHTML += '<th style="width: 55px; text-align: center;">#</th>';
    printHTML += '<th style="width: 210px; text-align: center;">หมายเลขอะไหล่</th>';
    printHTML += '<th style="text-align: left;">ชื่ออะไหล่</th>';
    printHTML += '<th style="width: 95px; text-align: center;">จำนวน</th>';
    printHTML += '</tr></thead><tbody>';

    group.items.forEach(function (item, index) {
        const rowBg = index % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
        printHTML += '<tr style="' + rowBg + '">';
        printHTML += '<td style="text-align: center; font-weight: bold; font-size: 16px;">' + (index + 1) + '</td>';
        printHTML += '<td style="font-family: monospace, Courier, sans-serif; font-size: 18px; font-weight: 800; letter-spacing: 0.8px; text-align: center;">' + escapeHtml(item.partNo) + '</td>';
        printHTML += '<td style="text-align: left; font-weight: 600; font-size: 17px;">' + escapeHtml(item.partName || '-') + '</td>';
        printHTML += '<td style="text-align: center; font-weight: 900; font-size: 20px;">' + item.qty + '</td>';
        printHTML += '</tr>';
    });

    printHTML += '</tbody></table></div>';

    // Summary Box
    printHTML += '<div class="summary-container">';
    printHTML += '<div class="summary-text">สรุปยอดรวมรายการอะไหล่:</div>';
    printHTML += '<div class="summary-qty">รวม ' + group.items.length + ' รายการ &nbsp;|&nbsp; ' + totalQty + ' ชิ้น</div>';
    printHTML += '</div>';

    printHTML += '</div>';
    printHTML += '</body></html>';

    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    // Print from iframe
    iframe.contentWindow.print();

    // Remove iframe after printing
    setTimeout(function () {
        document.body.removeChild(iframe);
    }, 1000);
}

document.querySelectorAll('.tab-btn[data-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
        if (typeof tab.scrollIntoView === 'function') {
            tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        if (tab.dataset.tab === 'search-all') {
            showSearchAll();
        } else if (tab.dataset.tab === 'notes') {
            showNotes();
        } else if (tab.dataset.tab === 'alerts') {
            showAlerts();
        } else if (tab.dataset.tab === 'deposit') {
            showDeposit();
        } else if (tab.dataset.tab === 'due-alerts') {
            showDueAlerts();
        } else if (tab.dataset.tab === 'calendar') {
            showCalendar();
        } else {
            openPerson(tab.dataset.tab);
        }
    });
});

document.querySelectorAll('#view-person .tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        showMenu(btn.dataset.menu);
    });
});

document.getElementById('btn-add-note').addEventListener('click', addNote);
document.getElementById('btn-add-deposit').addEventListener('click', addDeposit);
const btnPrintDepositForm = document.getElementById('btn-print-deposit-form');
if (btnPrintDepositForm) {
    btnPrintDepositForm.addEventListener('click', printDepositForm);
}
const btnTestDeadline = document.getElementById('btn-test-deadline-alert');
if (btnTestDeadline) {
    btnTestDeadline.addEventListener('click', testDeadlineAlertUI);
}
document.getElementById('btn-cancel-edit-deposit').addEventListener('click', clearDepositForm);
document.getElementById('btn-close-alerts').addEventListener('click', function () {
    document.getElementById('deadline-alerts').classList.add('hidden');
});
document.getElementById('btn-deadline-toggle').addEventListener('click', function () {
    document.getElementById('deadline-alerts').classList.toggle('hidden');
});

// Deposit tab navigation
document.querySelectorAll('[data-deposit-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
        const tabName = tab.dataset.depositTab;

        // Update tab buttons
        document.querySelectorAll('[data-deposit-tab]').forEach(function (t) {
            t.classList.toggle('active', t.dataset.depositTab === tabName);
        });

        // Show/hide content
        if (tabName === 'new') {
            document.getElementById('deposit-tab-new').classList.remove('hidden');
            document.getElementById('deposit-tab-history').classList.add('hidden');
        } else {
            document.getElementById('deposit-tab-new').classList.add('hidden');
            document.getElementById('deposit-tab-history').classList.remove('hidden');
            loadDepositHistory();
        }
    });
});

// Deposit history actions (event delegation)
document.getElementById('view-deposit').addEventListener('click', function (e) {
    const deleteBtn = e.target.closest('[data-delete-history]');
    const printBtn = e.target.closest('[data-print-history]');

    if (deleteBtn) {
        deleteDepositHistory(deleteBtn.dataset.deleteHistory);
    }

    if (printBtn) {
        // Load history data and print
        database.ref('depositHistory').once('value').then(function (snapshot) {
            const history = snapshot.val();
            if (!history) return;

            Object.values(history).forEach(function (deposit) {
                if (deposit.originalId === printBtn.dataset.printHistory) {
                    printDepositHTML(
                        deposit.customer,
                        deposit.phone,
                        deposit.orderDate,
                        deposit.expectedDate,
                        deposit.amount,
                        '',
                        deposit.items,
                        deposit.createdAt,
                        deposit.createdTime,
                        deposit.licensePlate || ''
                    );
                }
            });
        }).catch(function (error) {
            console.error('Error loading history for print:', error);
        });
    }
});

// Auto-calculate deposit item totals
function calculateDepositItemTotal() {
    const qty = Number(document.getElementById('deposit-part-qty').value) || 0;
    const price = Number(document.getElementById('deposit-part-price').value) || 0;
    const total = qty * price;
    const grandTotal = total * 1.07;

    document.getElementById('deposit-part-total').value = total.toFixed(2);
    document.getElementById('deposit-part-grand-total').value = grandTotal.toFixed(2);
}

document.getElementById('deposit-part-qty').addEventListener('input', calculateDepositItemTotal);
document.getElementById('deposit-part-price').addEventListener('input', calculateDepositItemTotal);

document.getElementById('btn-add-deposit-item').addEventListener('click', function () {
    const partNo = document.getElementById('deposit-part-no').value.trim();
    const partName = document.getElementById('deposit-part-name').value.trim();
    const qty = Number(document.getElementById('deposit-part-qty').value);
    const price = Number(document.getElementById('deposit-part-price').value);
    const total = qty * price;
    const grandTotal = total * 1.07;

    if (!partNo) {
        alert('กรุณากรอกเลขอะไหล่');
        return;
    }

    if (partNo.length !== 10) {
        alert('เลขอะไหล่ต้องมี 10 หลักเท่านั้น');
        return;
    }

    if (qty < 1) {
        alert('จำนวนต้องมากกว่า 0');
        return;
    }

    if (price < 0) {
        alert('ราคาต้องไม่ติดลบ');
        return;
    }

    depositItems.push({
        partNo: partNo,
        partName: partName,
        qty: qty,
        price: price,
        total: total,
        grandTotal: grandTotal
    });

    document.getElementById('deposit-part-no').value = '';
    document.getElementById('deposit-part-name').value = '';
    document.getElementById('deposit-part-qty').value = 1;
    document.getElementById('deposit-part-price').value = '';
    document.getElementById('deposit-part-total').value = '';
    document.getElementById('deposit-part-grand-total').value = '';

    renderDepositItems();
});

document.getElementById('deposit-items-tbody').addEventListener('click', function (e) {
    const removeBtn = e.target.closest('[data-remove-deposit-item]');
    if (removeBtn) {
        const index = parseInt(removeBtn.dataset.removeDepositItem);
        depositItems.splice(index, 1);
        renderDepositItems();
    }
});

document.getElementById('notes-container').addEventListener('click', function (e) {
    const editBtn = e.target.closest('[data-edit-note]');
    const deleteBtn = e.target.closest('[data-delete-note]');

    if (editBtn) {
        editNote(editBtn.dataset.editNote);
    }

    if (deleteBtn) {
        deleteNote(deleteBtn.dataset.deleteNote);
    }
});

function updatePersonTabs() {
    document.querySelectorAll('.tab-btn[data-tab]').forEach(function (tab) {
        let isActive = false;
        if (tab.dataset.tab === 'search-all') {
            isActive = (currentPerson === 'search-all');
        } else if (tab.dataset.tab === 'notes') {
            isActive = (currentPerson === 'notes');
        } else if (tab.dataset.tab === 'alerts') {
            isActive = (currentPerson === 'alerts');
        } else if (tab.dataset.tab === 'deposit') {
            isActive = (currentPerson === 'deposit');
        } else if (tab.dataset.tab === 'due-alerts') {
            isActive = (currentPerson === 'due-alerts');
        } else if (tab.dataset.tab === 'calendar') {
            isActive = (currentPerson === 'calendar');
        } else {
            isActive = (tab.dataset.tab === currentPerson);
        }
        tab.classList.toggle('active', isActive);
        if (isActive && typeof tab.scrollIntoView === 'function') {
            tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    });
}

// PIN Input Logic is now in HTML to avoid duplicate initialization

// Load data from Firebase on startup
function loadFromFirebase() {
    const ordersRef = database.ref('orders');
    ordersRef.on('value', function(snapshot) {
        const data = snapshot.val();
        if (data) {
            ordersCache = data;
            // Ensure all people have arrays
            Object.keys(PEOPLE).forEach(function(personId) {
                if (!ordersCache[personId]) {
                    ordersCache[personId] = [];
                }
            });
        } else {
            // Initialize empty data if none exists
            ordersCache = {
                tey: [],
                som: [],
                nu: [],
                o: [],
                flash: [],
                oi: [],
                bek: [],
                chang: [],
                customer: []
            };
        }
        console.log('Data loaded from Firebase:', ordersCache);
        // Re-render if table is visible
        if (currentMenu === 'list') {
            renderTable();
        }
        if (currentPerson === 'search-all') {
            renderSearchAll();
        }
        if (currentPerson === 'due-alerts') {
            loadDueAlerts();
        }
        updateDueBadge();
    }, function(error) {
        console.error('Error loading from Firebase:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    });
}

function initNoteInteractions() {
    // Quick Tag Chips
    document.querySelectorAll('.note-tag-chip').forEach(function (chip) {
        chip.addEventListener('click', function () {
            const tag = this.dataset.tag;
            const textarea = document.getElementById('note-input');
            if (!textarea) return;
            const cur = textarea.value;
            if (cur.trim().length === 0) {
                textarea.value = tag + ' ';
            } else {
                textarea.value = cur.trimEnd() + '\n' + tag + ' ';
            }
            textarea.focus();
        });
    });

    // Preset buttons for alert time
    document.querySelectorAll('.note-preset-btn[data-preset]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const preset = this.dataset.preset;
            const dateInput = document.getElementById('note-alert-date');
            const timeInput = document.getElementById('note-alert-time');
            if (!dateInput || !timeInput) return;

            const d = new Date();
            d.setDate(d.getDate() + 1);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dateInput.value = y + '-' + m + '-' + day;

            if (preset === 'tomorrow-morning') {
                timeInput.value = '09:00';
            } else if (preset === 'tomorrow-afternoon') {
                timeInput.value = '13:30';
            }
        });
    });

    // Clear alert time button
    const clearAlertBtn = document.getElementById('btn-clear-note-alert-time');
    if (clearAlertBtn) {
        clearAlertBtn.addEventListener('click', function () {
            const dateInput = document.getElementById('note-alert-date');
            const timeInput = document.getElementById('note-alert-time');
            if (dateInput) dateInput.value = '';
            if (timeInput) timeInput.value = '';
        });
    }

    // Search Notes input
    const searchInput = document.getElementById('note-search-input');
    const clearSearchBtn = document.getElementById('btn-clear-note-search');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            noteSearchQuery = this.value.trim();
            if (clearSearchBtn) {
                clearSearchBtn.classList.toggle('hidden', !noteSearchQuery);
            }
            renderNotesList();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function () {
            if (searchInput) {
                searchInput.value = '';
                noteSearchQuery = '';
                this.classList.add('hidden');
                renderNotesList();
                searchInput.focus();
            }
        });
    }

    // Filter note categories
    document.querySelectorAll('.btn-filter-note').forEach(function (btn) {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.btn-filter-note').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentNoteFilter = this.dataset.noteFilter;
            renderNotesList();
        });
    });
}

// Initialize app when ready
function initApp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, initializing app...');
            loadFromFirebase();
            openPerson('tey');
            checkDeadlineAlerts();
            checkNoteAlerts();
            setupNoteAlertsListeners();
            setupDueAlertsListeners();
            updateDueBadge();
            initNoteInteractions();
            initCalendarView();
        });
    } else {
        console.log('DOM already ready, initializing app...');
        loadFromFirebase();
        openPerson('tey');
        checkDeadlineAlerts();
        checkNoteAlerts();
        setupNoteAlertsListeners();
        setupDueAlertsListeners();
        updateDueBadge();
        initNoteInteractions();
        initCalendarView();
    }
}

initApp();

// Check for note alerts every 30 seconds
setInterval(checkNoteAlerts, 30000);

// Check for deadline alerts every 30 seconds
setInterval(checkDeadlineAlerts, 30000);

function checkDeadlineAlerts() {
    database.ref('deposits').once('value').then(function (snapshot) {
        const deposits = snapshot.val();
        if (!deposits) return;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        deadlineAlerts = [];

        Object.values(deposits).forEach(function (deposit) {
            if (deposit.expectedDate === todayStr) {
                deadlineAlerts.push(deposit);
            }
        });

        updateDeadlineAlertsUI();
    }).catch(function (error) {
        console.error('Error checking deadline alerts:', error);
    });
}

// Test function to show deadline alert UI without modifying data
function testDeadlineAlertUI() {
    database.ref('deposits').once('value').then(function (snapshot) {
        const deposits = snapshot.val();
        if (!deposits || Object.keys(deposits).length === 0) {
            alert('ไม่มีรายการมัดจำสำหรับทดสอบ กรุณาสร้างรายการมัดจำก่อน');
            return;
        }

        const depositIds = Object.keys(deposits);
        const firstDepositId = depositIds[0];
        const deposit = deposits[firstDepositId];

        // Create a mock alert without modifying the actual data
        const mockAlert = {
            id: deposit.id,
            customer: deposit.customer,
            phone: deposit.phone,
            expectedDate: deposit.expectedDate,
            amount: deposit.amount,
            items: deposit.items
        };

        deadlineAlerts = [mockAlert];
        updateDeadlineAlertsUI();
        alert('ทดสอบแจ้งเตือน: แสดง UI แจ้งเตือนเรียบร้อย (ไม่ได้แก้ข้อมูลจริง)');
    }).catch(function (error) {
        console.error('Error loading deposits for test:', error);
    });
}

function updateDeadlineAlertsUI() {
    const toggleBtn = document.getElementById('btn-deadline-toggle');
    const sidebar = document.getElementById('deadline-alerts');
    const list = document.getElementById('deadline-alerts-list');
    const badge = document.getElementById('deadline-badge');

    list.innerHTML = '';

    if (deadlineAlerts.length === 0) {
        toggleBtn.classList.add('hidden');
        sidebar.classList.add('hidden');
        return;
    }

    toggleBtn.classList.remove('hidden');
    badge.textContent = deadlineAlerts.length;

    deadlineAlerts.forEach(function (deposit) {
        const alertItem = document.createElement('div');
        alertItem.className = 'deadline-alert-item';
        alertItem.innerHTML =
            '<div class="deadline-alert-customer">' +
            '<i class="fa-solid fa-user me-2"></i>' + escapeHtml(deposit.customer) +
            (deposit.licensePlate ? ' <span class="badge bg-light text-dark border ms-1"><i class="fa-solid fa-car me-1 text-primary"></i>' + escapeHtml(deposit.licensePlate) + '</span>' : '') +
            '</div>' +
            '<div class="deadline-alert-date">' +
            '<i class="fa-solid fa-phone me-1"></i>' + escapeHtml(deposit.phone) +
            '<span class="ms-3"><i class="fa-solid fa-calendar me-1"></i>กำหนดรับ: ' + deposit.expectedDate + '</span>' +
            '</div>' +
            '<div class="deadline-alert-actions">' +
            '<button class="btn btn-success btn-sm" data-received="' + deposit.id + '">' +
            '<i class="fa-solid fa-check me-1"></i>รับแล้ว' +
            '</button>' +
            '<button class="btn btn-outline-secondary btn-sm" data-dismiss="' + deposit.id + '">' +
            '<i class="fa-solid fa-clock me-1"></i>ต่อเวลา' +
            '</button>' +
            '</div>';
        list.appendChild(alertItem);
    });

    // Add event listeners
    list.querySelectorAll('[data-received]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            markDepositReceived(btn.dataset.received);
        });
    });

    list.querySelectorAll('[data-dismiss]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            dismissDeadlineAlert(btn.dataset.dismiss);
        });
    });
}

function markDepositReceived(depositId) {
    if (!confirm('ยืนยันว่าลูกค้ามารับของแล้ว?')) return;

    database.ref('deposits/' + depositId).once('value').then(function (snapshot) {
        const deposit = snapshot.val();
        if (!deposit) return;

        // Move to history
        const historyId = 'history-' + depositId;
        const historyData = {
            ...deposit,
            originalId: depositId,
            receivedDate: new Date().toISOString().split('T')[0],
            receivedTime: getCurrentTime(),
            receivedDateTh: todayTh(),
            receivedTimeTh: getCurrentTime()
        };

        // Add to history
        database.ref('depositHistory/' + historyId).set(historyData).then(function () {
            // Remove from active deposits
            database.ref('deposits/' + depositId).remove().then(function () {
                // Remove from alerts
                deadlineAlerts = deadlineAlerts.filter(function (d) { return d.id !== depositId; });
                updateDeadlineAlertsUI();
                loadDeposits();
                alert('บันทึกว่าลูกค้ามารับของแล้วเรียบร้อย');
            }).catch(function (error) {
                console.error('Error removing deposit:', error);
                alert('เกิดข้อผิดพลาด: ' + error.message);
            });
        }).catch(function (error) {
            console.error('Error adding to history:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        });
    }).catch(function (error) {
        console.error('Error loading deposit:', error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
    });
}

function loadDepositHistory() {
    database.ref('depositHistory').on('value', function (snapshot) {
        const history = snapshot.val();
        const container = document.getElementById('deposit-history-container');
        const empty = document.getElementById('deposit-history-empty');
        container.innerHTML = '';
        container.appendChild(empty);

        if (!history || Object.keys(history).length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        // Group by customer
        const groupedByCustomer = {};
        Object.values(history).forEach(function (deposit) {
            const key = deposit.customer.toLowerCase();
            if (!groupedByCustomer[key]) {
                groupedByCustomer[key] = {
                    customer: deposit.customer,
                    phone: deposit.phone,
                    history: [],
                    totalDeposit: 0
                };
            }
            groupedByCustomer[key].history.push(deposit);
            groupedByCustomer[key].totalDeposit += deposit.amount;
        });

        Object.values(groupedByCustomer).forEach(function (group) {
            const groupCard = document.createElement('div');
            groupCard.className = 'card-custom p-4 mb-4 deposit-group-card';

            // Group header
            const header = document.createElement('div');
            header.className = 'deposit-group-header';
            header.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            header.innerHTML =
                '<div class="d-flex justify-content-between align-items-center">' +
                '<div class="d-flex align-items-center gap-3">' +
                '<div class="deposit-customer-badge">' +
                '<i class="fa-solid fa-user me-2"></i>' +
                escapeHtml(group.customer) +
                '</div>' +
                '<div class="deposit-phone-badge">' +
                '<i class="fa-solid fa-phone me-1"></i>' +
                escapeHtml(group.phone) +
                '</div>' +
                '</div>' +
                '<div class="deposit-summary-badge">' +
                '<i class="fa-solid fa-check-circle me-1"></i>' +
                'มัดจำรวม: ' + group.totalDeposit.toLocaleString() + ' บาท' +
                '</div>' +
                '</div>';
            groupCard.appendChild(header);

            // Add each history item
            group.history.forEach(function (deposit) {
                const historyDiv = document.createElement('div');
                historyDiv.className = 'deposit-item-card mt-3 p-3';
                historyDiv.style.background = 'var(--bg-gray)';
                historyDiv.style.borderRadius = '8px';
                historyDiv.innerHTML =
                    '<div class="d-flex justify-content-between align-items-center mb-2">' +
                    '<div class="d-flex align-items-center flex-wrap gap-2">' +
                    '<small class="text-muted"><i class="fa-solid fa-calendar me-1"></i>สั่ง: ' + deposit.orderDate + '</small>' +
                    '<small class="text-muted ms-2"><i class="fa-solid fa-clock me-1"></i>รับ: ' + deposit.expectedDate + '</small>' +
                    (deposit.licensePlate ? '<span class="badge bg-light text-dark border ms-2"><i class="fa-solid fa-car me-1 text-success"></i>' + escapeHtml(deposit.licensePlate) + '</span>' : '') +
                    '</div>' +
                    '<div>' +
                    '<span class="badge bg-success">มัดจำ: ' + deposit.amount.toLocaleString() + ' บาท</span>' +
                    '</div>' +
                    '</div>' +
                    '<small class="text-muted"><i class="fa-solid fa-check-circle me-1"></i>มารับเมื่อ: ' + deposit.receivedDateTh + ' ' + deposit.receivedTimeTh + '</small>' +
                    '<div class="mt-2 text-end">' +
                    '<button class="btn btn-sm btn-outline-success" data-print-history="' + deposit.originalId + '">' +
                    '<i class="fa-solid fa-print me-1"></i> พิมพ์' +
                    '</button>' +
                    '<button class="btn btn-sm btn-outline-danger ms-2" data-delete-history="' + deposit.originalId + '">' +
                    '<i class="fa-solid fa-trash"></i> ลบ' +
                    '</button>' +
                    '</div>';
                groupCard.appendChild(historyDiv);
            });

            container.appendChild(groupCard);
        });
    });
}

function deleteDepositHistory(originalId) {
    if (!confirm('ลบประวัติการมัดจำนี้หรือไม่?')) return;

    database.ref('depositHistory').once('value').then(function (snapshot) {
        const history = snapshot.val();
        if (!history) return;

        // Find and delete the history item
        Object.keys(history).forEach(function (historyId) {
            if (history[historyId].originalId === originalId) {
                database.ref('depositHistory/' + historyId).remove().then(function () {
                    alert('ลบประวัติเรียบร้อย');
                }).catch(function (error) {
                    console.error('Error deleting history:', error);
                    alert('เกิดข้อผิดพลาด: ' + error.message);
                });
            }
        });
    }).catch(function (error) {
        console.error('Error loading history:', error);
    });
}

function dismissDeadlineAlert(depositId) {
    database.ref('deposits/' + depositId).once('value').then(function (snapshot) {
        const deposit = snapshot.val();
        if (!deposit) return;

        // Extend expected date by 1 day
        const expectedDate = new Date(deposit.expectedDate);
        expectedDate.setDate(expectedDate.getDate() + 1);
        const newExpectedDate = expectedDate.toISOString().split('T')[0];

        database.ref('deposits/' + depositId).update({
            expectedDate: newExpectedDate
        }).then(function () {
            deadlineAlerts = deadlineAlerts.filter(function (d) { return d.id !== depositId; });
            updateDeadlineAlertsUI();
            alert('ต่อเวลากำหนดรับของเรียบร้อย');
        }).catch(function (error) {
            console.error('Error extending deadline:', error);
            alert('เกิดข้อผิดพลาด: ' + error.message);
        });
    }).catch(function (error) {
        console.error('Error loading deposit:', error);
    });
}

function checkNoteAlerts() {
    database.ref('notes').once('value').then(function (snapshot) {
        const notes = snapshot.val();
        if (!notes) {
            noteAlerts = [];
            updateNoteAlertsUI();
            return;
        }

        const now = new Date();
        noteAlerts = [];

        Object.values(notes).forEach(function (note) {
            if (note.alertDate && note.alertTime && !note.alerted) {
                const alertDateTime = new Date(note.alertDate + 'T' + note.alertTime);
                if (now >= alertDateTime) {
                    noteAlerts.push(note);
                }
            }
        });

        updateNoteAlertsUI();
    }).catch(function (error) {
        console.error('Error checking note alerts:', error);
    });
}

function updateNoteAlertsUI() {
    var toggleBtn = document.getElementById('btn-note-toggle');
    var sidebar = document.getElementById('note-alerts');
    var list = document.getElementById('note-alerts-list');
    var badge = document.getElementById('note-alert-badge');

    if (!toggleBtn || !list || !badge) return;

    list.innerHTML = '';

    if (noteAlerts.length === 0) {
        toggleBtn.classList.add('hidden');
        sidebar.classList.add('hidden');
        return;
    }

    toggleBtn.classList.remove('hidden');
    badge.textContent = noteAlerts.length;

    noteAlerts.forEach(function (note) {
        var alertItem = document.createElement('div');
        alertItem.className = 'note-alert-item';

        var alertDateStr = note.alertDate + ' ' + note.alertTime;

        alertItem.innerHTML =
            '<div class="note-alert-text">' +
            '<i class="fa-solid fa-sticky-note me-2"></i>' + escapeHtml(note.text) +
            '</div>' +
            '<div class="note-alert-date">' +
            '<span style="color:#ef4444;font-weight:600;font-size:0.8rem;"><i class="fa-solid fa-exclamation-circle me-1"></i>ถึงเวลาแจ้งเตือนแล้ว!</span>' +
            '<span class="ms-3"><i class="fa-solid fa-clock me-1"></i>' + alertDateStr + '</span>' +
            '</div>' +
            '<div class="note-alert-actions">' +
            '<button class="btn btn-success btn-sm" data-note-dismiss="' + note.id + '">' +
            '<i class="fa-solid fa-check me-1"></i>รับทราบ' +
            '</button>' +
            '<button class="btn btn-outline-secondary btn-sm" data-note-goto="' + note.id + '">' +
            '<i class="fa-solid fa-arrow-right me-1"></i>ไปที่โน๊ต' +
            '</button>' +
            '</div>';
        list.appendChild(alertItem);
    });

    // Add event listeners
    list.querySelectorAll('[data-note-dismiss]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            markNoteAlerted(btn.dataset.noteDismiss);
        });
    });

    list.querySelectorAll('[data-note-goto]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            // Close sidebar and go to notes tab
            document.getElementById('note-alerts').classList.add('hidden');
            // Switch to notes tab
            var notesTab = document.querySelector('[data-tab="notes"]');
            if (notesTab) notesTab.click();
        });
    });
}

function markNoteAlerted(noteId) {
    database.ref('notes/' + noteId).update({
        alerted: true
    }).then(function () {
        noteAlerts = noteAlerts.filter(function (n) { return n.id !== noteId; });
        updateNoteAlertsUI();
    }).catch(function (error) {
        console.error('Error marking note as alerted:', error);
        alert('เกิดข้อผิดพลาด: ' + error.message);
    });
}

function setupNoteAlertsListeners() {
    // Toggle button
    var toggleBtn = document.getElementById('btn-note-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
            var sidebar = document.getElementById('note-alerts');
            sidebar.classList.toggle('hidden');
        });
    }

    // Close button
    var closeBtn = document.getElementById('btn-close-note-alerts');
    if (closeBtn) {
        closeBtn.addEventListener('click', function () {
            document.getElementById('note-alerts').classList.add('hidden');
        });
    }
}

// Deposit Functions
function addDeposit() {
    const customer = document.getElementById('deposit-customer').value.trim();
    const phone = document.getElementById('deposit-phone').value.trim();
    const licensePlate = document.getElementById('deposit-license-plate').value.trim();
    const orderDate = document.getElementById('deposit-order-date').value;
    const expectedDate = document.getElementById('deposit-expected-date').value;
    const amount = Number(document.getElementById('deposit-amount').value);

    if (!customer) {
        alert('กรุณากรอกชื่อลูกค้า');
        return;
    }

    if (!phone) {
        alert('กรุณากรอกเบอร์ติดต่อ');
        return;
    }

    if (!orderDate) {
        alert('กรุณาเลือกวันที่สั่งอะไหล่');
        return;
    }

    if (!expectedDate) {
        alert('กรุณาเลือกกำหนดรับของ');
        return;
    }

    if (amount < 0) {
        alert('ยอดมัดจำต้องไม่ติดลบ');
        return;
    }

    if (editingDepositId) {
        // Update existing deposit
        database.ref('deposits/' + editingDepositId).update({
            customer: customer,
            phone: phone,
            licensePlate: licensePlate,
            orderDate: orderDate,
            expectedDate: expectedDate,
            amount: amount,
            items: depositItems
        }).then(function () {
            clearDepositForm();
            alert('แก้ไขรายการมัดจำเรียบร้อย');
        }).catch(function (error) {
            console.error('Error updating deposit:', error);
            alert('เกิดข้อผิดพลาดในการแก้ไขรายการมัดจำ: ' + error.message);
        });
    } else {
        // Add new deposit
        const depositId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
        const deposit = {
            id: depositId,
            customer: customer,
            phone: phone,
            licensePlate: licensePlate,
            orderDate: orderDate,
            expectedDate: expectedDate,
            amount: amount,
            vat: 7,
            items: depositItems,
            note: '',
            createdAt: todayTh(),
            createdTime: getCurrentTime()
        };

        database.ref('deposits/' + depositId).set(deposit).then(function () {
            clearDepositForm();
        }).catch(function (error) {
            console.error('Error adding deposit:', error);
            alert('เกิดข้อผิดพลาดในการเพิ่มรายการมัดจำ: ' + error.message);
        });
    }
}

function clearDepositForm() {
    document.getElementById('deposit-customer').value = '';
    document.getElementById('deposit-phone').value = '';
    document.getElementById('deposit-license-plate').value = '';
    document.getElementById('deposit-order-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('deposit-expected-date').value = '';
    document.getElementById('deposit-amount').value = '';
    depositItems = [];
    editingDepositId = null;
    renderDepositItems();

    // Reset button
    document.getElementById('btn-add-deposit').innerHTML = '<i class="fa-solid fa-plus me-2"></i> เพิ่มรายการมัดจำ';
    document.getElementById('btn-cancel-edit-deposit').classList.add('hidden');
}

function loadDepositToForm(depositId) {
    database.ref('deposits/' + depositId).once('value').then(function (snapshot) {
        const deposit = snapshot.val();
        if (!deposit) return;

        editingDepositId = depositId;

        document.getElementById('deposit-customer').value = deposit.customer;
        document.getElementById('deposit-phone').value = deposit.phone;
        document.getElementById('deposit-license-plate').value = deposit.licensePlate || '';
        document.getElementById('deposit-order-date').value = deposit.orderDate;
        document.getElementById('deposit-expected-date').value = deposit.expectedDate;
        document.getElementById('deposit-amount').value = deposit.amount;

        depositItems = deposit.items || [];
        renderDepositItems();

        // Change button to save edit
        document.getElementById('btn-add-deposit').innerHTML = '<i class="fa-solid fa-save me-2"></i> บันทึกการแก้ไข';
        document.getElementById('btn-cancel-edit-deposit').classList.remove('hidden');

        // Scroll to form
        document.getElementById('view-deposit').scrollIntoView({ behavior: 'smooth' });
    }).catch(function (error) {
        console.error('Error loading deposit:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    });
}

function renderDepositItems() {
    const tbody = document.getElementById('deposit-items-tbody');
    const container = document.getElementById('deposit-items-container');
    const countSpan = document.getElementById('deposit-count');

    tbody.innerHTML = '';
    countSpan.textContent = depositItems.length;

    if (depositItems.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    depositItems.forEach(function (item, index) {
        const total = item.qty * item.price;
        const grandTotal = total * 1.07;
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td class="ps-2 fw-medium">' + (index + 1) + '</td>' +
            '<td class="fw-bold text-primary">' + escapeHtml(item.partNo) + '</td>' +
            '<td>' + escapeHtml(item.partName || '-') + '</td>' +
            '<td class="text-center fw-bold">' + item.qty + '</td>' +
            '<td class="text-center">' + item.price.toLocaleString() + '</td>' +
            '<td class="text-center fw-bold" style="background:#fff3cd;">' + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
            '<td class="text-center fw-bold" style="background:linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); color:#1565c0; border-left:3px solid #1565c0;">' + grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
            '<td class="text-center">' +
            '<button class="btn btn-outline-danger btn-action" data-remove-deposit-item="' + index + '"><i class="fa-solid fa-trash"></i></button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

function loadDeposits() {
    database.ref('deposits').on('value', function (snapshot) {
        const deposits = snapshot.val();
        const container = document.getElementById('deposits-container');
        const empty = document.getElementById('deposits-empty');
        container.innerHTML = '';
        container.appendChild(empty);

        if (!deposits || Object.keys(deposits).length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        // Group by customer
        const groupedByCustomer = {};
        Object.values(deposits).forEach(function (deposit) {
            const key = deposit.customer.toLowerCase();
            if (!groupedByCustomer[key]) {
                groupedByCustomer[key] = {
                    customer: deposit.customer,
                    phone: deposit.phone,
                    deposits: [],
                    totalDeposit: 0,
                    totalWithVat: 0
                };
            }
            groupedByCustomer[key].deposits.push(deposit);
            groupedByCustomer[key].totalDeposit += deposit.amount;
            groupedByCustomer[key].totalWithVat += (deposit.amount + (deposit.amount * deposit.vat / 100));
        });

        Object.values(groupedByCustomer).forEach(function (group) {
            const groupCard = document.createElement('div');
            groupCard.className = 'card-custom p-4 mb-4 deposit-group-card';

            // Group header
            const header = document.createElement('div');
            header.className = 'deposit-group-header';
            header.innerHTML =
                '<div class="d-flex justify-content-between align-items-center">' +
                '<div class="d-flex align-items-center gap-3">' +
                '<div class="deposit-customer-badge">' +
                '<i class="fa-solid fa-user me-2"></i>' +
                escapeHtml(group.customer) +
                '</div>' +
                '<div class="deposit-phone-badge">' +
                '<i class="fa-solid fa-phone me-1"></i>' +
                escapeHtml(group.phone) +
                '</div>' +
                '</div>' +
                '<div class="deposit-summary-badge">' +
                '<i class="fa-solid fa-money-bill-wave me-1"></i>' +
                'มัดจำรวม: ' + group.totalDeposit.toLocaleString() + ' บาท' +
                '</div>' +
                '</div>';
            groupCard.appendChild(header);

            // Add each deposit in this group
            group.deposits.forEach(function (deposit) {
                const totalWithVat = deposit.amount + (deposit.amount * deposit.vat / 100);

                let itemsHtml = '';
                let itemsTotal = 0;
                let itemsGrandTotal = 0;

                if (deposit.items && deposit.items.length > 0) {
                    itemsHtml = '<div class="mt-3 pt-3" style="border-top: 2px solid var(--border-color);">' +
                        '<h6 class="fw-bold mb-2" style="font-size:0.9rem;">รายการอะไหล่</h6>' +
                        '<table class="table table-sm align-middle mb-0">' +
                        '<thead>' +
                        '<tr class="custom-table-header">' +
                        '<th class="py-2 ps-2">เลขอะไหล่</th>' +
                        '<th class="py-2">ชื่ออะไหล่</th>' +
                        '<th class="py-2 text-center">จำนวน</th>' +
                        '<th class="py-2 text-center">ราคา/หน่วย</th>' +
                        '<th class="py-2 text-center">ราคารวม</th>' +
                        '<th class="py-2 text-center">ราคาสุทธิ (+7%)</th>' +
                        '</tr>' +
                        '</thead>' +
                        '<tbody>';

                    deposit.items.forEach(function (item) {
                        const total = item.qty * item.price;
                        const grandTotal = total * 1.07;
                        itemsTotal += total;
                        itemsGrandTotal += grandTotal;
                        itemsHtml +=
                            '<tr>' +
                            '<td class="ps-2 fw-bold text-primary">' + escapeHtml(item.partNo) + '</td>' +
                            '<td>' + escapeHtml(item.partName || '-') + '</td>' +
                            '<td class="text-center fw-bold">' + item.qty + '</td>' +
                            '<td class="text-center">' + item.price.toLocaleString() + '</td>' +
                            '<td class="text-center fw-bold" style="background:#fff3cd;">' + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                            '<td class="text-center fw-bold" style="background:linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); color:#1565c0; border-left:3px solid #1565c0;">' + grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>' +
                            '</tr>';
                    });

                    itemsHtml += '</tbody></table>';

                    // Add summary section
                    itemsHtml += '<div class="mt-3 p-3" style="background:var(--bg-gray); border-radius:8px;">' +
                        '<div class="row g-2">' +
                        '<div class="col-md-4">' +
                        '<div class="summary-item">' +
                        '<small class="text-muted d-block">ราคารวมทั้งหมด</small>' +
                        '<div class="fw-bold" style="font-size:1.1rem; color:#856404;">' + itemsTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</div>' +
                        '</div>' +
                        '</div>' +
                        '<div class="col-md-4">' +
                        '<div class="summary-item">' +
                        '<small class="text-muted d-block">VAT 7%</small>' +
                        '<div class="fw-bold" style="font-size:1.1rem; color:#856404;">' + (itemsTotal * 0.07).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</div>' +
                        '</div>' +
                        '</div>' +
                        '<div class="col-md-4">' +
                        '<div class="summary-item">' +
                        '<small class="text-muted d-block">ยอดสุทธิ</small>' +
                        '<div class="fw-bold grand-total-highlight" style="font-size:1.3rem; color:#1565c0; padding:10px 15px; border-radius:12px; background:linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); display:inline-block; min-width:150px; text-align:center;">' + itemsGrandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>';

                    itemsHtml += '</div>';
                }

                const depositDiv = document.createElement('div');
                depositDiv.className = 'deposit-item-card mt-3 p-3';
                depositDiv.style.background = 'var(--bg-gray)';
                depositDiv.style.borderRadius = '8px';
                depositDiv.dataset.depositCard = deposit.id;
                depositDiv.innerHTML =
                    '<div class="d-flex justify-content-between align-items-center mb-2">' +
                    '<div class="d-flex align-items-center flex-wrap gap-2">' +
                    '<small class="text-muted"><i class="fa-solid fa-calendar me-1"></i>สั่ง: ' + deposit.orderDate + '</small>' +
                    '<small class="text-muted ms-2"><i class="fa-solid fa-clock me-1"></i>รับ: ' + deposit.expectedDate + '</small>' +
                    (deposit.licensePlate ? '<span class="badge bg-light text-dark border ms-2"><i class="fa-solid fa-car me-1 text-primary"></i>' + escapeHtml(deposit.licensePlate) + '</span>' : '') +
                    '</div>' +
                    '</div>' +
                    '<small class="text-muted">บันทึกเมื่อ: ' + deposit.createdAt + ' ' + deposit.createdTime + '</small>' +
                    itemsHtml +
                    '<div class="mt-2 text-end">' +
                    '<button class="btn btn-sm btn-outline-success" data-print-deposit="' + deposit.id + '">' +
                    '<i class="fa-solid fa-print me-1"></i> พิมพ์' +
                    '</button>' +
                    '<button class="btn btn-sm btn-outline-primary ms-2" data-edit-deposit="' + deposit.id + '">' +
                    '<i class="fa-solid fa-pen"></i> แก้ไขในฟอร์ม' +
                    '</button>' +
                    '<button class="btn btn-sm btn-outline-danger ms-2" data-delete-deposit="' + deposit.id + '">' +
                    '<i class="fa-solid fa-trash"></i> ลบ' +
                    '</button>' +
                    '</div>';
                groupCard.appendChild(depositDiv);
            });

            container.appendChild(groupCard);
        });
    });
}

function deleteDeposit(depositId) {
    if (!confirm('ลบรายการมัดจำนี้หรือไม่?')) return;

    database.ref('deposits/' + depositId).remove().then(function () {
        // Deposit removed successfully
    }).catch(function (error) {
        console.error('Error deleting deposit:', error);
        alert('เกิดข้อผิดพลาดในการลบรายการมัดจำ: ' + error.message);
    });
}

function printDepositForm() {
    const customer = document.getElementById('deposit-customer').value.trim();
    const phone = document.getElementById('deposit-phone').value.trim();
    const licensePlate = document.getElementById('deposit-license-plate').value.trim();
    const orderDate = document.getElementById('deposit-order-date').value;
    const expectedDate = document.getElementById('deposit-expected-date').value;
    const amount = Number(document.getElementById('deposit-amount').value);

    if (!customer || !phone || !orderDate || !expectedDate) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนพิมพ์');
        return;
    }

    printDepositHTML(customer, phone, orderDate, expectedDate, amount, '', depositItems, todayTh(), getCurrentTime(), licensePlate);
}

function printDeposit(depositId) {
    database.ref('deposits/' + depositId).once('value').then(function (snapshot) {
        const deposit = snapshot.val();
        if (!deposit) return;

        printDepositHTML(
            deposit.customer,
            deposit.phone,
            deposit.orderDate,
            deposit.expectedDate,
            deposit.amount,
            deposit.note,
            deposit.items,
            deposit.createdAt,
            deposit.createdTime,
            deposit.licensePlate || ''
        );
    }).catch(function (error) {
        console.error('Error loading deposit:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    });
}

function printDepositHTML(customer, phone, orderDate, expectedDate, amount, note, items, createdAt, createdTime, licensePlate) {
    // Convert dates to Thai format
    function formatDateToThai(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const y = d.getFullYear() + 543;
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + y;
    }

    const orderDateTh = formatDateToThai(orderDate);
    const expectedDateTh = formatDateToThai(expectedDate);
    const printDateTh = todayTh();
    const printTime = getCurrentTime();

    // Calculate totals
    let itemsTotal = 0;
    let itemsGrandTotal = 0;
    let itemsHtml = '';

    if (items && items.length > 0) {
        itemsHtml = '<div class="table-container"><table class="items-table">';
        itemsHtml += '<thead><tr>';
        itemsHtml += '<th style="border: 1px solid #000; color: #000000; font-weight: 800; font-size: 14px; width: 6%;">ลำดับ</th>';
        itemsHtml += '<th style="border: 1px solid #000; color: #000000; font-weight: 800; font-size: 14px; width: 22%;">หมายเลขอะไหล่</th>';
        itemsHtml += '<th style="border: 1px solid #000; color: #000000; font-weight: 800; font-size: 14px; width: 28%; text-align: left;">ชื่ออะไหล่ / รายละเอียด</th>';
        itemsHtml += '<th style="border: 1px solid #000; color: #000000; font-weight: 800; font-size: 14px; width: 9%;">จำนวน</th>';
        itemsHtml += '<th style="border: 1px solid #000; color: #000000; font-weight: 800; font-size: 14px; width: 15%; text-align: right;">ราคา/หน่วย</th>';
        itemsHtml += '<th style="border: 1px solid #000; color: #000000; font-weight: 800; font-size: 14px; width: 20%; text-align: right;">ราคาสุทธิ</th>';
        itemsHtml += '</tr></thead><tbody>';

        items.forEach(function (item, index) {
            const total = item.qty * item.price;
            const grandTotal = total * 1.07;
            itemsTotal += total;
            itemsGrandTotal += grandTotal;

            const rowBg = index % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;';
            itemsHtml += '<tr style="' + rowBg + '">';
            itemsHtml += '<td style="border: 1px solid #000; text-align: center; color: #000; font-weight: bold;">' + (index + 1) + '</td>';
            itemsHtml += '<td style="border: 1px solid #000; font-family: monospace; font-size: 13.5px; font-weight: bold; color: #000; letter-spacing: 0.5px;">' + escapeHtml(item.partNo) + '</td>';
            itemsHtml += '<td style="border: 1px solid #000; text-align: left; font-weight: 500; color: #000;">' + escapeHtml(item.partName || '-') + (item.itemNote ? ' <span style="font-size: 12px; color: #000;">(' + escapeHtml(item.itemNote) + ')</span>' : '') + '</td>';
            itemsHtml += '<td style="border: 1px solid #000; text-align: center; font-weight: bold; color: #000;">' + item.qty + '</td>';
            itemsHtml += '<td style="border: 1px solid #000; text-align: right; color: #000;">' + item.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
            itemsHtml += '<td style="border: 1px solid #000; text-align: right; font-weight: bold; color: #000;">' + grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
            itemsHtml += '</tr>';
        });

        itemsHtml += '</tbody></table></div>';
    }

    const vatAmount = itemsTotal * 0.07;
    const finalAmount = itemsGrandTotal > 0 ? itemsGrandTotal : amount;
    const remainingAmount = finalAmount - amount;

    // Create print HTML
    let printHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
    printHTML += '<title></title>';
    printHTML += '<style>';
    printHTML += '@import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap");';
    printHTML += '@page { size: A4 portrait; margin: 0; }';
    printHTML += '* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }';
    printHTML += 'html, body { margin: 0; padding: 0; background-color: #fff; }';
    printHTML += 'body { font-family: "Sarabun", "Tahoma", sans-serif; color: #000; line-height: 1.45; font-size: 13px; }';
    printHTML += '.doc-container { width: 100%; max-width: 100%; margin: 0 auto; padding: 12mm 15mm 12mm 15mm; background: #fff; }';
    
    // Header Bar
    printHTML += '.brand-bar { height: 5px; background: linear-gradient(90deg, #dc2626 0%, #ef4444 38%, #1e3a8a 38%, #2563eb 100%); border-radius: 2px; margin-bottom: 12px; }';
    printHTML += '.header-table { width: 100%; border-collapse: collapse; border-bottom: 2.5px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 16px; }';
    printHTML += '.brand-title { font-size: 21px; font-weight: 800; color: #dc2626; letter-spacing: 0.8px; margin: 0 0 2px 0; }';
    printHTML += '.header-title { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }';
    printHTML += '.header-sub { font-size: 14px; font-weight: bold; color: #334155; margin-top: 4px; }';
    printHTML += '.header-meta { text-align: right; font-size: 12.5px; color: #000; vertical-align: bottom; white-space: nowrap; }';
    
    // Customer Info Card
    printHTML += '.info-card { border: 1.5px solid #000; border-radius: 8px; background: #fff; padding: 12px 18px; margin-bottom: 16px; }';
    printHTML += '.info-grid { width: 100%; border-collapse: collapse; }';
    printHTML += '.info-grid td { padding: 6px 8px; vertical-align: middle; font-size: 13.5px; color: #000; }';
    printHTML += '.info-label { font-weight: bold; color: #000; white-space: nowrap; width: 1%; padding-right: 10px; }';
    printHTML += '.info-val { font-weight: bold; color: #000; white-space: nowrap; }';
    printHTML += '.plate-badge { display: inline-block; background: #fff; color: #000; font-weight: bold; padding: 3px 12px; border-radius: 6px; border: 1.5px solid #000; font-size: 13px; letter-spacing: 0.5px; }';
    
    // Items Table (Rounded container & Full Grid Dividers)
    printHTML += '.table-container { border: 1.5px solid #000; border-radius: 8px; overflow: hidden; margin-bottom: 16px; background: #fff; }';
    printHTML += '.items-table { width: 100%; border-collapse: collapse; margin: 0; }';
    printHTML += '.items-table th, .items-table td { border: 1px solid #000; }';
    printHTML += '.items-table th { background: #e2e8f0; color: #000000 !important; font-weight: 800 !important; font-size: 14px; padding: 10px 10px; text-align: center; border-bottom: 2px solid #000; }';
    printHTML += '.items-table td { padding: 9px 10px; font-size: 13px; color: #000; }';
    
    // Summary & Financial Section (Rounded container & Clean Grid)
    printHTML += '.calc-container { border: 1.5px solid #000; border-radius: 8px; overflow: hidden; background: #fff; margin-left: auto; }';
    printHTML += '.calc-box { width: 100%; border-collapse: collapse; margin: 0; }';
    printHTML += '.calc-box td { padding: 9px 16px; font-size: 13.5px; border-bottom: 1px solid #000; color: #000; }';
    printHTML += '.calc-box tr:last-child td { border-bottom: none; }';
    printHTML += '.calc-label { text-align: right; color: #000; font-weight: bold; border-right: 1px solid #000; }';
    printHTML += '.calc-val { text-align: right; font-weight: bold; color: #000; width: 150px; }';
    printHTML += '.row-subtotal { background: #f8fafc; }';
    printHTML += '.row-net { background: #eff6ff; }';
    printHTML += '.row-net td { color: #1e40af !important; font-weight: bold !important; font-size: 14px !important; }';
    printHTML += '.row-deposit { background: #fef2f2; }';
    printHTML += '.row-deposit td { color: #dc2626 !important; font-weight: bold !important; font-size: 14px !important; border-top: 1px solid #000; border-bottom: 1px solid #000; }';
    printHTML += '.row-balance { background: #ecfdf5; }';
    printHTML += '.row-balance td { color: #047857 !important; font-weight: 800 !important; font-size: 16px !important; border-top: 1.5px solid #000; border-bottom: none; }';
    
    // Signatures Section
    printHTML += '.signatures-table { width: 100%; border-collapse: collapse; margin-top: 36px; margin-bottom: 16px; }';
    printHTML += '.sig-box { width: 42%; text-align: center; padding: 10px; }';
    printHTML += '.sig-line { width: 220px; border-top: 1.5px solid #000; margin: 40px auto 6px auto; }';
    printHTML += '.sig-role { font-weight: bold; font-size: 13px; color: #1e3a8a; }';
    printHTML += '.sig-date { font-size: 12px; color: #000; margin-top: 4px; }';
    printHTML += '</style>';
    printHTML += '</head><body>';

    printHTML += '<div class="doc-container">';
    
    // Brand Stripe
    printHTML += '<div class="brand-bar"></div>';

    // Header Table
    printHTML += '<table class="header-table">';
    printHTML += '<tr>';
    printHTML += '<td style="vertical-align: bottom;">';
    printHTML += '<div class="brand-title">ISUZU HUA CHIANG CHAN</div>';
    printHTML += '<div class="header-title">ใบรับมัดจำอะไหล่</div>';
    printHTML += '<div class="header-sub">ศูนย์บริการอีซูซุฮั่วเชียงจั่น โทร. 081-6395800</div>';
    printHTML += '</td>';
    printHTML += '<td class="header-meta">';
    printHTML += 'วันที่พิมพ์เอกสาร: <strong style="color: #000;">' + printDateTh + ' ' + printTime + '</strong>';
    printHTML += '</td>';
    printHTML += '</tr>';
    printHTML += '</table>';

    // Customer & Order Info Card
    printHTML += '<div class="info-card">';
    printHTML += '<table class="info-grid">';
    printHTML += '<tr>';
    printHTML += '<td class="info-label">ชื่อลูกค้า:</td>';
    printHTML += '<td class="info-val" style="font-size: 14px; color: #000;">' + escapeHtml(customer) + '</td>';
    printHTML += '<td class="info-label" style="padding-left: 20px;">วันที่สั่งอะไหล่:</td>';
    printHTML += '<td class="info-val">' + orderDateTh + '</td>';
    printHTML += '</tr>';
    printHTML += '<tr>';
    printHTML += '<td class="info-label">เบอร์โทรติดต่อ:</td>';
    printHTML += '<td class="info-val">' + escapeHtml(phone) + '</td>';
    printHTML += '<td class="info-label" style="padding-left: 20px;">กำหนดรับสินค้า:</td>';
    printHTML += '<td class="info-val">' + expectedDateTh + '</td>';
    printHTML += '</tr>';
    if (licensePlate) {
        printHTML += '<tr>';
        printHTML += '<td class="info-label">ทะเบียนรถ:</td>';
        printHTML += '<td class="info-val" colspan="3"><span class="plate-badge">' + escapeHtml(licensePlate) + '</span></td>';
        printHTML += '</tr>';
    }
    printHTML += '</table>';
    printHTML += '</div>';

    // Items Table (if any)
    if (itemsHtml) {
        printHTML += '<div style="font-weight: bold; margin-bottom: 6px; font-size: 13px; color: #000;">';
        printHTML += 'รายการอะไหล่ที่สั่งซื้อ (' + items.length + ' รายการ):';
        printHTML += '</div>';
        printHTML += itemsHtml;
    }

    // Financial Calculation (Spacious Layout)
    printHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 20px;">';
    printHTML += '<tr>';
    printHTML += '<td style="vertical-align: top; width: 40%; padding-right: 20px;">';
    if (note) {
        printHTML += '<div style="border: 1.5px solid #000; border-left: 5px solid #2563eb; background: #f8fafc; border-radius: 8px; padding: 12px 14px; font-size: 13.5px; color: #000; line-height: 1.5;">';
        printHTML += '<div style="font-weight: bold; color: #1e40af; margin-bottom: 4px;">หมายเหตุ:</div>';
        printHTML += escapeHtml(note);
        printHTML += '</div>';
    }
    printHTML += '</td>';
    printHTML += '<td style="vertical-align: top; width: 60%;">';
    printHTML += '<div class="calc-container"><table class="calc-box">';
    if (itemsTotal > 0) {
        printHTML += '<tr class="row-subtotal">';
        printHTML += '<td class="calc-label" style="color: #475569;">รวมมูลค่าสินค้า (ก่อน VAT):</td>';
        printHTML += '<td class="calc-val">' + itemsTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</td>';
        printHTML += '</tr>';
        printHTML += '<tr class="row-subtotal">';
        printHTML += '<td class="calc-label" style="color: #475569;">ภาษีมูลค่าเพิ่ม VAT 7%:</td>';
        printHTML += '<td class="calc-val">' + vatAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</td>';
        printHTML += '</tr>';
        printHTML += '<tr class="row-net">';
        printHTML += '<td class="calc-label">ราคาสุทธิทั้งสิ้น:</td>';
        printHTML += '<td class="calc-val">' + itemsGrandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</td>';
        printHTML += '</tr>';
    }
    printHTML += '<tr class="row-deposit">';
    printHTML += '<td class="calc-label">หักยอดเงินมัดจำ:</td>';
    printHTML += '<td class="calc-val">- ' + amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</td>';
    printHTML += '</tr>';
    if (itemsTotal > 0) {
        printHTML += '<tr class="row-balance">';
        printHTML += '<td class="calc-label">ยอดคงเหลือที่ต้องชำระ:</td>';
        printHTML += '<td class="calc-val">' + remainingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</td>';
        printHTML += '</tr>';
    }
    printHTML += '</table></div>';
    printHTML += '</td>';
    printHTML += '</tr>';
    printHTML += '</table>';

    // Signatures Section
    printHTML += '<table class="signatures-table">';
    printHTML += '<tr>';
    printHTML += '<td class="sig-box">';
    printHTML += '<div class="sig-line"></div>';
    printHTML += '<div class="sig-role">ผู้สั่งซื้อ / ลูกค้า</div>';
    printHTML += '<div class="sig-date">วันที่ ........ / ........ / ........</div>';
    printHTML += '</td>';
    printHTML += '<td style="width: 16%;"></td>';
    printHTML += '<td class="sig-box">';
    printHTML += '<div class="sig-line"></div>';
    printHTML += '<div class="sig-role">ผู้รับเงิน / พนักงานออกใบมัดจำ</div>';
    printHTML += '<div class="sig-date">วันที่ ........ / ........ / ........</div>';
    printHTML += '</td>';
    printHTML += '</tr>';
    printHTML += '</table>';

    printHTML += '</div>'; // doc-container
    printHTML += '</body></html>';

    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    // Print from iframe
    iframe.contentWindow.print();

    // Remove iframe after printing
    setTimeout(function () {
        document.body.removeChild(iframe);
    }, 1000);
}

function editDeposit(depositId) {
    database.ref('deposits/' + depositId).once('value').then(function (snapshot) {
        const deposit = snapshot.val();
        if (!deposit) return;

        // Show inline edit in the deposit card
        const depositCard = document.querySelector('[data-deposit-card="' + depositId + '"]');
        if (!depositCard) return;

        // Replace the card with edit form
        depositCard.innerHTML = renderDepositEditForm(deposit);

        // Add event listener for add item button
        document.getElementById('btn-add-edit-item').addEventListener('click', function () {
            const tbody = document.getElementById('edit-items-tbody');
            const newIndex = tbody.querySelectorAll('tr').length;
            const tr = document.createElement('tr');
            tr.dataset.itemIndex = newIndex;
            tr.innerHTML =
                '<td class="ps-2 fw-medium">' + (newIndex + 1) + '</td>' +
                '<td><input type="text" class="form-control form-control-sm" value="" data-field="partNo" placeholder="เลขอะไหล่"></td>' +
                '<td><input type="text" class="form-control form-control-sm" value="" data-field="partName" placeholder="ชื่ออะไหล่"></td>' +
                '<td><input type="number" class="form-control form-control-sm" value="1" min="1" data-field="qty"></td>' +
                '<td><input type="number" class="form-control form-control-sm" value="0" step="0.01" data-field="price"></td>' +
                '<td class="text-center fw-bold">0.00</td>' +
                '<td class="text-center fw-bold" style="background:#ffebee; color:#dc2626;">0.00</td>' +
                '<td class="text-center">' +
                '<button class="btn btn-sm btn-outline-danger btn-action" data-remove-item="' + newIndex + '"><i class="fa-solid fa-trash"></i></button>' +
                '</td>';
            tbody.appendChild(tr);
        });
    }).catch(function (error) {
        console.error('Error loading deposit:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    });
}

function saveDepositEdit(depositId) {
    const customer = document.getElementById('edit-customer').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const licensePlate = document.getElementById('edit-license-plate') ? document.getElementById('edit-license-plate').value.trim() : '';
    const orderDate = document.getElementById('edit-order-date').value;
    const expectedDate = document.getElementById('edit-expected-date').value;
    const amount = Number(document.getElementById('edit-amount').value);

    if (!customer || !phone || !orderDate || !expectedDate) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    // Collect items
    const items = [];
    const tbody = document.getElementById('edit-items-tbody');
    tbody.querySelectorAll('tr').forEach(function (tr) {
        const partNo = tr.querySelector('[data-field="partNo"]').value.trim();
        const partName = tr.querySelector('[data-field="partName"]').value.trim();
        const qty = Number(tr.querySelector('[data-field="qty"]').value);
        const price = Number(tr.querySelector('[data-field="price"]').value);

        if (partNo && qty > 0) {
            items.push({
                partNo: partNo,
                partName: partName,
                qty: qty,
                price: price,
                total: qty * price,
                grandTotal: (qty * price) * 1.07
            });
        }
    });

    database.ref('deposits/' + depositId).update({
        customer: customer,
        phone: phone,
        licensePlate: licensePlate,
        orderDate: orderDate,
        expectedDate: expectedDate,
        amount: amount,
        items: items
    }).then(function () {
        alert('บันทึกการแก้ไขเรียบร้อย');
        loadDeposits();
    }).catch(function (error) {
        console.error('Error updating deposit:', error);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    });
}

function renderDepositEditForm(deposit) {
    let itemsHtml = '';
    if (deposit.items && deposit.items.length > 0) {
        deposit.items.forEach(function (item, index) {
            itemsHtml += '<tr data-item-index="' + index + '">';
            itemsHtml += '<td class="ps-2 fw-medium">' + (index + 1) + '</td>';
            itemsHtml += '<td><input type="text" class="form-control form-control-sm" value="' + escapeHtml(item.partNo) + '" data-field="partNo"></td>';
            itemsHtml += '<td><input type="text" class="form-control form-control-sm" value="' + escapeHtml(item.partName || '') + '" data-field="partName"></td>';
            itemsHtml += '<td><input type="number" class="form-control form-control-sm" value="' + item.qty + '" min="1" data-field="qty"></td>';
            itemsHtml += '<td><input type="number" class="form-control form-control-sm" value="' + item.price + '" step="0.01" data-field="price"></td>';
            itemsHtml += '<td class="text-center fw-bold">' + (item.qty * item.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
            itemsHtml += '<td class="text-center fw-bold" style="background:#ffebee; color:#dc2626;">' + ((item.qty * item.price) * 1.07).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
            itemsHtml += '<td class="text-center">';
            itemsHtml += '<button class="btn btn-sm btn-outline-danger btn-action" data-remove-item="' + index + '"><i class="fa-solid fa-trash"></i></button>';
            itemsHtml += '</td>';
            itemsHtml += '</tr>';
        });
    }

    return '<div class="deposit-edit-form p-3" style="background: #fff3cd; border-radius: 8px; border: 2px solid #ffc107;">' +
        '<h6 class="fw-bold mb-3"><i class="fa-solid fa-pen me-2"></i>แก้ไขรายการมัดจำ</h6>' +
        '<div class="row g-2 mb-3">' +
        '<div class="col-md-3">' +
        '<label class="form-label small fw-bold mb-1">ชื่อลูกค้า</label>' +
        '<input type="text" class="form-control form-control-sm" id="edit-customer" value="' + escapeHtml(deposit.customer) + '">' +
        '</div>' +
        '<div class="col-md-2">' +
        '<label class="form-label small fw-bold mb-1">เบอร์ติดต่อ</label>' +
        '<input type="text" class="form-control form-control-sm" id="edit-phone" value="' + escapeHtml(deposit.phone) + '">' +
        '</div>' +
        '<div class="col-md-2">' +
        '<label class="form-label small fw-bold mb-1">ทะเบียนรถ</label>' +
        '<input type="text" class="form-control form-control-sm" id="edit-license-plate" value="' + escapeHtml(deposit.licensePlate || '') + '" placeholder="เช่น 1กข-1234">' +
        '</div>' +
        '<div class="col-md-2">' +
        '<label class="form-label small fw-bold mb-1">วันที่สั่ง</label>' +
        '<input type="date" class="form-control form-control-sm" id="edit-order-date" value="' + deposit.orderDate + '">' +
        '</div>' +
        '<div class="col-md-2">' +
        '<label class="form-label small fw-bold mb-1">กำหนดรับของ</label>' +
        '<input type="date" class="form-control form-control-sm" id="edit-expected-date" value="' + deposit.expectedDate + '">' +
        '</div>' +
        '<div class="col-md-1">' +
        '<label class="form-label small fw-bold mb-1">ยอดมัดจำ</label>' +
        '<input type="number" class="form-control form-control-sm" id="edit-amount" value="' + deposit.amount + '" step="0.01">' +
        '</div>' +
        '</div>' +
        '<div class="card-custom p-2 mb-3" style="background:var(--bg-gray);">' +
        '<h6 class="fw-bold mb-2" style="font-size:0.85rem;">รายการอะไหล่</h6>' +
        '<div class="table-responsive">' +
        '<table class="table table-sm align-middle mb-0">' +
        '<thead>' +
        '<tr class="custom-table-header">' +
        '<th class="py-2 ps-2" style="width: 50px;">#</th>' +
        '<th class="py-2">เลขอะไหล่</th>' +
        '<th class="py-2">ชื่ออะไหล่</th>' +
        '<th class="py-2 text-center">จำนวน</th>' +
        '<th class="py-2 text-center">ราคา/หน่วย</th>' +
        '<th class="py-2 text-center">ราคารวม</th>' +
        '<th class="py-2 text-center">ราคาสุทธิ</th>' +
        '<th class="py-2 text-center">จัดการ</th>' +
        '</tr>' +
        '</thead>' +
        '<tbody id="edit-items-tbody">' + itemsHtml + '</tbody>' +
        '</table>' +
        '</div>' +
        '<button type="button" class="btn btn-sm btn-primary mt-2" id="btn-add-edit-item">' +
        '<i class="fa-solid fa-plus me-1"></i> เพิ่มรายการ' +
        '</button>' +
        '</div>' +
        '<div class="d-flex gap-2">' +
        '<button class="btn btn-sm btn-success" data-save-edit="' + deposit.id + '">' +
        '<i class="fa-solid fa-save me-1"></i> บันทึก' +
        '</button>' +
        '<button class="btn btn-sm btn-secondary" data-cancel-edit="' + deposit.id + '">' +
        '<i class="fa-solid fa-times me-1"></i> ยกเลิก' +
        '</button>' +
        '</div>' +
        '</div>';
}

document.getElementById('deposits-container').addEventListener('click', function (e) {
    const editBtn = e.target.closest('[data-edit-deposit]');
    const deleteBtn = e.target.closest('[data-delete-deposit]');
    const printBtn = e.target.closest('[data-print-deposit]');
    const saveEditBtn = e.target.closest('[data-save-edit]');
    const cancelEditBtn = e.target.closest('[data-cancel-edit]');
    const removeItemBtn = e.target.closest('[data-remove-item]');

    if (printBtn) {
        printDeposit(printBtn.dataset.printDeposit);
    }

    if (editBtn) {
        editDeposit(editBtn.dataset.editDeposit);
    }

    if (deleteBtn) {
        deleteDeposit(deleteBtn.dataset.deleteDeposit);
    }

    if (saveEditBtn) {
        saveDepositEdit(saveEditBtn.dataset.saveEdit);
    }

    if (cancelEditBtn) {
        loadDeposits(); // Reload to cancel edit
    }

    if (removeItemBtn) {
        const tbody = removeItemBtn.closest('tbody');
        const tr = removeItemBtn.closest('tr');
        tr.remove();
        // Reindex rows
        Array.from(tbody.querySelectorAll('tr')).forEach(function (row, index) {
            row.querySelector('td:first-child').textContent = index + 1;
            row.dataset.itemIndex = index;
            row.querySelector('[data-remove-item]').dataset.removeItem = index;
        });
    }
});

// Multiple Items Logic
function renderTempItems() {
    const tbody = document.getElementById('temp-items-tbody');
    const container = document.getElementById('temp-items-container');
    const countSpan = document.getElementById('temp-count');

    tbody.innerHTML = '';
    countSpan.textContent = tempItems.length;

    if (tempItems.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';

    tempItems.forEach(function (item, index) {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td class="ps-2 fw-medium">' + (index + 1) + '</td>' +
            '<td class="fw-bold text-primary">' + escapeHtml(item.partNo) + '</td>' +
            '<td>' + escapeHtml(item.partName || '-') + '</td>' +
            '<td class="text-center fw-bold">' + item.qty + '</td>' +
            '<td class="text-muted small">' + escapeHtml(item.itemNote || '-') + '</td>' +
            '<td class="text-center">' +
            '<button class="btn btn-outline-secondary btn-action me-1" data-edit-temp="' + index + '" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>' +
            '<button class="btn btn-outline-danger btn-action" data-remove-temp="' + index + '" title="ลบ"><i class="fa-solid fa-trash"></i></button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-add-item').addEventListener('click', function () {
    const partNo = document.getElementById('temp-part-no-hidden').value.trim().toUpperCase();
    const partName = document.getElementById('temp-part-name').value.trim();
    const qty = Number(document.getElementById('temp-qty').value);
    const itemNote = document.getElementById('temp-item-note').value.trim();

    if (!partNo) {
        alert('กรุณากรอกเลขอะไหล่');
        return;
    }

    if (partNo.length !== 10) {
        alert('เลขอะไหล่ต้องมี 10 หลัก');
        return;
    }

    if (qty < 1) {
        alert('จำนวนต้องมากกว่า 0');
        return;
    }

    tempItems.push({
        partNo: partNo,
        partName: partName,
        qty: qty,
        itemNote: itemNote
    });

    document.getElementById('temp-part-no-hidden').value = '';
    document.getElementById('temp-part-no').value = '';
    document.getElementById('temp-part-name').value = '';
    document.getElementById('temp-qty').value = 1;
    document.getElementById('temp-item-note').value = '';

    // Reset PIN boxes
    const boxes = document.querySelectorAll('.pin-box-small');
    boxes.forEach(function (box) {
        box.textContent = '';
        box.classList.remove('filled', 'active');
    });
    boxes[0].classList.add('active');

    document.getElementById('temp-part-no-hidden').focus();

    renderTempItems();
});

document.getElementById('temp-items-tbody').addEventListener('click', function (e) {
    const removeBtn = e.target.closest('[data-remove-temp]');
    const editBtn = e.target.closest('[data-edit-temp]');

    if (removeBtn) {
        const index = parseInt(removeBtn.dataset.removeTemp);
        tempItems.splice(index, 1);
        renderTempItems();
    }

    if (editBtn) {
        const index = parseInt(editBtn.dataset.editTemp);
        const item = tempItems[index];
        if (item) {
            document.getElementById('temp-part-no-hidden').value = item.partNo;
            document.getElementById('temp-part-no').value = item.partNo;
            document.getElementById('temp-part-name').value = item.partName;
            document.getElementById('temp-qty').value = item.qty;
            document.getElementById('temp-item-note').value = item.itemNote || '';

            // Update PIN boxes
            const boxes = document.querySelectorAll('.pin-box-small');
            if (boxes.length > 0) {
                boxes.forEach(function (box, idx) {
                    box.classList.remove('active');
                    if (idx < item.partNo.length) {
                        box.textContent = item.partNo[idx];
                        box.classList.add('filled');
                    } else {
                        box.textContent = '';
                        box.classList.remove('filled');
                    }
                });
                if (item.partNo.length < 10) {
                    boxes[item.partNo.length].classList.add('active');
                }
            }

            // Remove the item being edited
            tempItems.splice(index, 1);
            renderTempItems();
            document.getElementById('temp-part-no-hidden').focus();
        }
    }
});

document.querySelectorAll('[data-open-menu]').forEach(function (card) {
    card.addEventListener('click', function () {
        showMenu(card.dataset.openMenu);
    });
});

document.getElementById('btn-save').addEventListener('click', function () {
    const btn = this;
    const editId = document.getElementById('edit-id').value;

    try {
        btn.classList.add('loading');

        if (tempItems.length === 0) {
            alert('กรุณาเพิ่มรายการอะไหล่อย่างน้อย 1 รายการ');
            btn.classList.remove('loading');
            return;
        }

        const orderType = document.getElementById('order-type').value;
        const licensePlate = document.getElementById('license-plate').value.trim();
        const note = document.getElementById('note').value.trim();

        let batchId;
        let date;
        let time;

        if (editId) {
            if (editId.startsWith('edit-batch:')) {
                // Edit batch mode - remove all items from the batch
                const oldBatchId = editId.replace('edit-batch:', '');
                let list = getOrders();
                const existingBatch = list.find(function (x) { return x.batchId === oldBatchId; });
                if (existingBatch) {
                    batchId = oldBatchId;
                    date = existingBatch.date;
                    time = existingBatch.time;
                    // Remove all items from this batch
                    setOrders(list.filter(function (x) { return x.batchId !== oldBatchId; }));
                } else {
                    batchId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
                    date = todayTh();
                    time = getCurrentTime();
                }
            } else if (editId.startsWith('add-to-batch:')) {
                // Add to existing batch
                const targetBatchId = editId.replace('add-to-batch:', '');
                let list = getOrders();
                const existingBatch = list.find(function (x) { return x.batchId === targetBatchId; });
                if (existingBatch) {
                    batchId = targetBatchId;
                    date = existingBatch.date;
                    time = existingBatch.time;
                    licensePlate = existingBatch.licensePlate || licensePlate;
                } else {
                    batchId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
                    date = todayTh();
                    time = getCurrentTime();
                }
            } else {
                // Edit single item mode - remove old item
                let list = getOrders();
                const idx = list.findIndex(function (x) { return x.id === editId; });
                if (idx !== -1) {
                    list.splice(idx, 1);
                    setOrders(list);
                }
                // Create new batch for edited item
                batchId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
                date = todayTh();
                time = getCurrentTime();
            }
        } else {
            // Normal save - create new batch
            batchId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
            date = todayTh();
            time = getCurrentTime();
        }

        // Add all temp items
        let list = getOrders();
        tempItems.forEach(function (item) {
            list.unshift({
                id: String(Date.now()) + Math.random().toString(36).substr(2, 9),
                batchId: batchId,
                date: date,
                time: time,
                partNo: item.partNo,
                partName: item.partName,
                qty: item.qty,
                itemNote: item.itemNote || '',
                type: orderType,
                licensePlate: licensePlate,
                note: note,
                received: false
            });
        });

        setOrders(list);

        // Reset form fields manually since it's a div, not a form
        document.getElementById('edit-id').value = '';
        document.getElementById('temp-part-no').value = '';
        document.getElementById('temp-part-no-hidden').value = '';
        document.getElementById('temp-part-name').value = '';
        document.getElementById('temp-qty').value = 1;
        document.getElementById('temp-item-note').value = '';
        document.getElementById('order-type').value = 'normal';
        document.getElementById('license-plate').value = '';
        document.getElementById('note').value = '';
        tempItems = [];

        // Reset PIN boxes
        const boxes = document.querySelectorAll('.pin-box-small');
        if (boxes.length > 0) {
            boxes.forEach(function (box) {
                box.textContent = '';
                box.classList.remove('filled', 'active');
            });
            boxes[0].classList.add('active');
        }

        // Hide cancel button
        document.getElementById('btn-cancel-edit-batch').classList.add('hidden');

        renderTempItems();

        setTimeout(function() {
            btn.classList.remove('loading');
            showMenu('list');
        }, 300);
    } catch (e) {
        console.error('Error saving:', e);
        alert('เกิดข้อผลในการบันทึก: ' + e.message);
        btn.classList.remove('loading');
    }
});

document.getElementById('btn-cancel-edit-batch').addEventListener('click', function () {
    // Reset form
    document.getElementById('edit-id').value = '';
    document.getElementById('temp-part-no').value = '';
    document.getElementById('temp-part-no-hidden').value = '';
    document.getElementById('temp-part-name').value = '';
    document.getElementById('temp-qty').value = 1;
    document.getElementById('temp-item-note').value = '';
    document.getElementById('order-type').value = 'normal';
    document.getElementById('license-plate').value = '';
    document.getElementById('note').value = '';
    tempItems = [];

    // Reset PIN boxes
    const boxes = document.querySelectorAll('.pin-box-small');
    if (boxes.length > 0) {
        boxes.forEach(function (box) {
            box.textContent = '';
            box.classList.remove('filled', 'active');
        });
        boxes[0].classList.add('active');
    }

    // Hide cancel button
    document.getElementById('btn-cancel-edit-batch').classList.add('hidden');

    renderTempItems();
    showMenu('list');
});

function saveInlineItem(itemId) {
    const list = getOrders();
    const item = list.find(function (x) { return x.id === itemId; });
    if (!item) return;

    const partNoInput = document.querySelector('.inline-edit-part-no[data-id="' + itemId + '"]');
    const partNameInput = document.querySelector('.inline-edit-part-name[data-id="' + itemId + '"]');
    const qtyInput = document.querySelector('.inline-edit-qty[data-id="' + itemId + '"]');
    const noteInput = document.querySelector('.inline-edit-note[data-id="' + itemId + '"]');

    if (!partNoInput) return;

    const newPartNo = partNoInput.value.trim().toUpperCase();
    const newPartName = partNameInput ? partNameInput.value.trim() : '';
    const newQty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    const newNote = noteInput ? noteInput.value.trim() : '';

    if (!newPartNo) {
        alert('กรุณากรอกเลขอะไหล่');
        partNoInput.focus();
        return;
    }

    if (newPartNo.length !== 10) {
        alert('เลขอะไหล่ต้องมี 10 หลัก');
        partNoInput.focus();
        return;
    }

    if (isNaN(newQty) || newQty < 1) {
        alert('จำนวนต้องมากกว่า 0');
        if (qtyInput) qtyInput.focus();
        return;
    }

    item.partNo = newPartNo;
    item.partName = newPartName;
    item.qty = newQty;
    item.itemNote = newNote;

    editingItemId = null;
    setOrders(list);
    renderTable();
}

document.getElementById('order-list-container').addEventListener('click', function (e) {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    const receiveBtn = e.target.closest('[data-receive]');
    const deleteBatchBtn = e.target.closest('[data-delete-batch]');
    const editBatchBtn = e.target.closest('[data-edit-batch]');
    const addToBatchBtn = e.target.closest('[data-add-to-batch]');
    const printBatchBtn = e.target.closest('[data-print-batch]');
    const editItemNoteBtn = e.target.closest('[data-edit-item-note]');
    const saveInlineBtn = e.target.closest('[data-save-inline]');
    const cancelInlineBtn = e.target.closest('[data-cancel-inline]');

    if (saveInlineBtn) {
        saveInlineItem(saveInlineBtn.dataset.saveInline);
        return;
    }

    if (cancelInlineBtn) {
        editingItemId = null;
        renderTable();
        return;
    }

    if (deleteBatchBtn) {
        if (!confirm('ลบทั้งกลุ่มนี้หรือไม่?')) return;
        const batchId = deleteBatchBtn.dataset.deleteBatch;
        setOrders(getOrders().filter(function (x) { return x.batchId !== batchId; }));
        renderTable();
        return;
    }

    if (editBatchBtn) {
        const batchId = editBatchBtn.dataset.editBatch;
        const list = getOrders();
        const batchItems = list.filter(function (x) { return x.batchId === batchId; });
        if (batchItems.length === 0) return;

        // Load batch items to temp items for editing
        tempItems = batchItems.map(function (item) {
            return {
                id: item.id,
                partNo: item.partNo,
                partName: item.partName,
                qty: item.qty,
                itemNote: item.itemNote
            };
        });

        // Set edit-id to indicate we're editing a batch
        document.getElementById('edit-id').value = 'edit-batch:' + batchId;
        document.getElementById('order-type').value = batchItems[0].type;
        document.getElementById('license-plate').value = batchItems[0].licensePlate || '';
        document.getElementById('note').value = batchItems[0].note;

        renderTempItems();
        showMenu('add');
        return;
    }

    if (addToBatchBtn) {
        const batchId = addToBatchBtn.dataset.addToBatch;
        const list = getOrders();
        const batchItems = list.filter(function (x) { return x.batchId === batchId; });
        if (batchItems.length === 0) return;

        // Open quick add modal
        quickAddBatchId = batchId;
        document.getElementById('quick-part-no').value = '';
        document.getElementById('quick-part-name').value = '';
        document.getElementById('quick-qty').value = 1;
        document.getElementById('quick-item-note').value = '';
        document.getElementById('quick-add-modal').classList.remove('hidden');
        document.getElementById('quick-part-no').focus();
        return;
    }

    if (printBatchBtn) {
        const batchId = printBatchBtn.dataset.printBatch;
        printBatch(batchId);
        return;
    }

    if (receiveBtn) {
        const list = getOrders();
        const item = list.find(function (x) { return x.id === receiveBtn.dataset.receive; });
        if (!item) return;

        item.received = !item.received;
        setOrders(list);
        renderTable();
        return;
    }

    if (editItemNoteBtn) {
        const list = getOrders();
        const item = list.find(function (x) { return x.id === editItemNoteBtn.dataset.editItemNote; });
        if (!item) return;

        const currentNote = item.itemNote || '';
        const newNote = prompt('แก้ไขหมายเหตุอะไหล่:', currentNote);
        if (newNote === null) return; // User cancelled

        item.itemNote = newNote.trim();
        setOrders(list);
        renderTable();
        return;
    }

    if (editBtn) {
        editingItemId = editBtn.dataset.edit;
        renderTable();
        return;
    }
    if (delBtn) {
        if (!confirm('ลบรายการนี้หรือไม่?')) return;
        setOrders(getOrders().filter(function (x) { return x.id !== delBtn.dataset.del; }));
        renderTable();
    }
});

document.getElementById('order-list-container').addEventListener('input', function (e) {
    if (e.target.matches('.inline-edit-part-no')) {
        e.target.value = e.target.value.toUpperCase();
    }
});

document.getElementById('order-list-container').addEventListener('keydown', function (e) {
    if (e.target.matches('.inline-edit-part-no, .inline-edit-part-name, .inline-edit-qty, .inline-edit-note')) {
        const itemId = e.target.dataset.id;
        if (e.key === 'Enter') {
            e.preventDefault();
            saveInlineItem(itemId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            editingItemId = null;
            renderTable();
        }
    }
});

document.getElementById('search-box').addEventListener('input', renderTable);

// Search All Functionality
function renderSearchAll() {
    const q = document.getElementById('search-all-box').value.trim().toUpperCase();
    const all = loadAll();
    const allOrders = [];

    // Flatten all orders from all people
    Object.keys(all).forEach(function (personId) {
        all[personId].forEach(function (item) {
            allOrders.push({
                ...item,
                personId: personId,
                personName: PEOPLE[personId].name
            });
        });
    });

    // Filter by search query
    const filtered = allOrders.filter(function (item) {
        if (!q) return false;
        return item.partNo.includes(q);
    });

    // Group by part number
    const grouped = {};
    filtered.forEach(function (item) {
        if (!grouped[item.partNo]) {
            grouped[item.partNo] = {
                partNo: item.partNo,
                partName: item.partName,
                orders: []
            };
        }
        grouped[item.partNo].orders.push(item);
    });

    const tbody = document.getElementById('search-all-tbody');
    const empty = document.getElementById('search-all-empty');
    tbody.innerHTML = '';

    if (!q) {
        empty.classList.remove('hidden');
        empty.textContent = 'พิมพ์เลขอะไหล่เพื่อค้นหา';
        return;
    }

    if (Object.keys(grouped).length === 0) {
        empty.classList.remove('hidden');
        empty.textContent = 'ไม่พบรายการที่ค้นหา';
        return;
    }

    empty.classList.add('hidden');

    Object.values(grouped).forEach(function (group) {
        group.orders.forEach(function (item, i) {
            const tr = document.createElement('tr');
            if (i === 0) {
                tr.innerHTML =
                    '<td class="ps-3 fw-bold text-primary" rowspan="' + group.orders.length + '">' + escapeHtml(group.partNo) + '</td>' +
                    '<td rowspan="' + group.orders.length + '">' + escapeHtml(group.partName || '-') + '</td>' +
                    '<td>' + escapeHtml(item.personName) + '</td>' +
                    '<td class="text-center fw-bold">' + item.qty + '</td>' +
                    '<td>' + item.date + '</td>' +
                    '<td class="' + (item.type === 'urgent' ? 'order-type-urgent' : 'order-type-normal') + '">' + (item.type === 'urgent' ? 'สั่งด่วน' : 'สั่งปกติ') + '</td>' +
                    '<td class="text-muted small">' + escapeHtml(item.note || '-') + '</td>';
            } else {
                tr.innerHTML =
                    '<td>' + escapeHtml(item.personName) + '</td>' +
                    '<td class="text-center fw-bold">' + item.qty + '</td>' +
                    '<td>' + item.date + '</td>' +
                    '<td class="' + (item.type === 'urgent' ? 'order-type-urgent' : 'order-type-normal') + '">' + (item.type === 'urgent' ? 'สั่งด่วน' : 'สั่งปกติ') + '</td>' +
                    '<td class="text-muted small">' + escapeHtml(item.note || '-') + '</td>';
            }
            tbody.appendChild(tr);
        });
    });
}

document.getElementById('search-all-box').addEventListener('input', renderSearchAll);

// Quick Add Modal Functions
document.getElementById('btn-close-quick-add').addEventListener('click', function () {
    document.getElementById('quick-add-modal').classList.add('hidden');
    quickAddBatchId = null;
});

document.getElementById('btn-cancel-quick-add').addEventListener('click', function () {
    document.getElementById('quick-add-modal').classList.add('hidden');
    quickAddBatchId = null;
});

document.getElementById('btn-save-quick-add').addEventListener('click', function () {
    const partNo = document.getElementById('quick-part-no').value.trim().toUpperCase();
    const partName = document.getElementById('quick-part-name').value.trim();
    const qty = Number(document.getElementById('quick-qty').value);
    const itemNote = document.getElementById('quick-item-note').value.trim();

    if (!partNo) {
        alert('กรุณากรอกเลขอะไหล่');
        return;
    }

    if (partNo.length !== 10) {
        alert('เลขอะไหล่ต้องมี 10 หลัก');
        return;
    }

    if (qty < 1) {
        alert('จำนวนต้องมากกว่า 0');
        return;
    }

    if (!quickAddBatchId) {
        alert('ไม่พบข้อมูล batch');
        return;
    }

    // Get the batch info
    const list = getOrders();
    const existingBatch = list.find(function (x) { return x.batchId === quickAddBatchId });

    if (!existingBatch) {
        alert('ไม่พบข้อมูล batch');
        return;
    }

    // Add new item to the batch
    const newItem = {
        id: String(Date.now()) + Math.random().toString(36).substr(2, 9),
        batchId: quickAddBatchId,
        date: existingBatch.date,
        time: existingBatch.time,
        partNo: partNo,
        partName: partName,
        qty: qty,
        itemNote: itemNote || '',
        type: existingBatch.type,
        licensePlate: existingBatch.licensePlate,
        note: existingBatch.note,
        received: false
    };

    list.unshift(newItem);
    setOrders(list);

    // Close modal and reset
    document.getElementById('quick-add-modal').classList.add('hidden');
    document.getElementById('quick-part-no').value = '';
    document.getElementById('quick-part-name').value = '';
    document.getElementById('quick-qty').value = 1;
    document.getElementById('quick-item-note').value = '';
    quickAddBatchId = null;

    // Refresh table
    renderTable();
});

// Check for items that should have been delivered
function checkDeliveries() {
    const all = loadAll();
    const today = todayTh();
    const pendingItems = [];

    Object.keys(all).forEach(function (personId) {
        all[personId].forEach(function (item) {
            if (!item.received) {
                const expectedDate = getExpectedDeliveryDate(item.date, item.type);
                const expected = parseDateTh(expectedDate);
                const current = parseDateTh(today);

                if (current >= expected) {
                    pendingItems.push({
                        person: PEOPLE[personId].name,
                        partNo: item.partNo,
                        partName: item.partName,
                        expectedDate: expectedDate,
                        isOverdue: current > expected
                    });
                }
            }
        });
    });

    if (pendingItems.length > 0) {
        let message = 'มีของที่ควรมาส่งแล้ว ' + pendingItems.length + ' รายการ:\n\n';
        pendingItems.forEach(function (item, i) {
            message += (i + 1) + '. ' + item.person + ' - ' + item.partNo;
            if (item.partName) message += ' (' + item.partName + ')';
            message += ' - ควรมาส่ง ' + item.expectedDate;
            if (item.isOverdue) message += ' (เกินกำหนดแล้ว!)';
            message += '\n';
        });
        alert(message);
    }
}

// ===================================================
// Due Parts Alerts Logic
// ===================================================
let dueAlertsFilterPerson = 'all';
let dueAlertsSearchQuery = '';

function updateDueBadge(count) {
    const badge = document.getElementById('badge-due-count');
    if (!badge) return;

    let dueCount = 0;
    if (typeof count === 'number') {
        dueCount = count;
    } else {
        const all = loadAll();
        const today = todayTh();
        const current = parseDateTh(today);
        Object.keys(all).forEach(function (pid) {
            if (!all[pid] || !Array.isArray(all[pid])) return;
            all[pid].forEach(function (item) {
                if (!item.received) {
                    const expectedDate = getExpectedDeliveryDate(item.date, item.type);
                    const expected = parseDateTh(expectedDate);
                    if (current >= expected) {
                        dueCount++;
                    }
                }
            });
        });
    }

    if (dueCount > 0) {
        badge.textContent = dueCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function loadDueAlerts() {
    const all = loadAll();
    const today = todayTh();
    const current = parseDateTh(today);
    const container = document.getElementById('due-alerts-container');
    const empty = document.getElementById('due-alerts-empty');

    if (!container) return;

    const dueItems = [];

    Object.keys(all).forEach(function (personId) {
        if (!all[personId] || !Array.isArray(all[personId])) return;

        all[personId].forEach(function (item) {
            if (!item.received) {
                const expectedDate = getExpectedDeliveryDate(item.date, item.type);
                const expected = parseDateTh(expectedDate);

                if (current >= expected) {
                    const diffTime = current.getTime() - expected.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    dueItems.push({
                        ...item,
                        personId: personId,
                        personName: PEOPLE[personId] ? PEOPLE[personId].name : personId,
                        expectedDate: expectedDate,
                        diffDays: diffDays,
                        isOverdue: diffDays > 0,
                        isToday: diffDays === 0
                    });
                }
            }
        });
    });

    // Update Stats
    const totalCount = dueItems.length;
    const overdueCount = dueItems.filter(function (x) { return x.isOverdue; }).length;
    const todayCount = dueItems.filter(function (x) { return x.isToday; }).length;

    const elTotal = document.getElementById('due-stat-total');
    const elOverdue = document.getElementById('due-stat-overdue');
    const elToday = document.getElementById('due-stat-today');
    if (elTotal) elTotal.textContent = totalCount + ' รายการ';
    if (elOverdue) elOverdue.textContent = overdueCount + ' รายการ';
    if (elToday) elToday.textContent = todayCount + ' รายการ';

    updateDueBadge(totalCount);

    // Populate person filter dropdown
    const personFilterSelect = document.getElementById('due-person-filter');
    if (personFilterSelect && personFilterSelect.options.length <= 1) {
        Object.keys(PEOPLE).forEach(function (pid) {
            const opt = document.createElement('option');
            opt.value = pid;
            opt.textContent = PEOPLE[pid].name;
            personFilterSelect.appendChild(opt);
        });
    }

    // Apply Filter
    let filteredItems = dueItems;
    if (dueAlertsFilterPerson && dueAlertsFilterPerson !== 'all') {
        filteredItems = filteredItems.filter(function (x) { return x.personId === dueAlertsFilterPerson; });
    }

    if (dueAlertsSearchQuery && dueAlertsSearchQuery.trim() !== '') {
        const q = dueAlertsSearchQuery.toLowerCase().trim();
        filteredItems = filteredItems.filter(function (x) {
            return (x.partNo && x.partNo.toLowerCase().includes(q)) ||
                   (x.partName && x.partName.toLowerCase().includes(q)) ||
                   (x.personName && x.personName.toLowerCase().includes(q)) ||
                   (x.licensePlate && x.licensePlate.toLowerCase().includes(q)) ||
                   (x.itemNote && x.itemNote.toLowerCase().includes(q)) ||
                   (x.note && x.note.toLowerCase().includes(q));
        });
    }

    container.innerHTML = '';

    if (filteredItems.length === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'card-custom p-5 text-center text-muted';
        if (dueItems.length === 0) {
            emptyDiv.innerHTML =
                '<i class="fa-solid fa-circle-check fa-3x text-success mb-3"></i>' +
                '<h6 class="fw-bold">ไม่มีรายการอะไหล่ที่ครบกำหนดวันแล้ว</h6>' +
                '<p class="small mb-0">รายการทั้งหมดได้รับของแล้ว หรือยังไม่ถึงกำหนดส่ง</p>';
        } else {
            emptyDiv.innerHTML =
                '<i class="fa-solid fa-magnifying-glass fa-3x text-muted mb-3"></i>' +
                '<h6 class="fw-bold">ไม่พบรายการที่ตรงกับคำค้นหา</h6>' +
                '<p class="small mb-0">ลองเปลี่ยนคำค้นหาหรือตัวกรองผู้สั่ง</p>';
        }
        container.appendChild(emptyDiv);
        return;
    }

    // Group items by batch
    const grouped = {};
    filteredItems.forEach(function (item) {
        const key = item.batchId || (item.personId + '_' + item.date + '_' + item.id);
        if (!grouped[key]) {
            grouped[key] = {
                batchId: item.batchId,
                personId: item.personId,
                personName: item.personName,
                date: item.date,
                time: item.time,
                type: item.type,
                expectedDate: item.expectedDate,
                diffDays: item.diffDays,
                isOverdue: item.isOverdue,
                licensePlate: item.licensePlate,
                note: item.note,
                items: []
            };
        }
        grouped[key].items.push(item);
    });

    // Sort: highest overdue first
    const sortedGroups = Object.values(grouped).sort(function (a, b) {
        return b.diffDays - a.diffDays;
    });

    sortedGroups.forEach(function (group) {
        const groupCard = document.createElement('div');
        groupCard.className = 'due-group-card';

        let badgeHtml = '';
        if (group.isOverdue) {
            badgeHtml = '<span class="due-badge-overdue"><i class="fa-solid fa-triangle-exclamation me-1"></i>เกินกำหนด ' + group.diffDays + ' วัน</span>';
        } else {
            badgeHtml = '<span class="due-badge-today"><i class="fa-solid fa-clock me-1"></i>ครบกำหนดวันนี้</span>';
        }

        const typeBadge = group.type === 'urgent'
            ? '<span class="badge bg-danger rounded-pill px-2 py-1"><i class="fa-solid fa-bolt me-1"></i>ด่วน</span>'
            : '<span class="badge bg-secondary rounded-pill px-2 py-1">ปกติ</span>';

        const totalQty = group.items.reduce(function (sum, it) { return sum + (it.qty || 1); }, 0);

        // Header
        const header = document.createElement('div');
        header.className = 'due-group-header';
        header.innerHTML =
            '<div class="d-flex flex-wrap align-items-center gap-2">' +
                '<span class="due-person-badge"><i class="fa-solid fa-user text-primary"></i>' + escapeHtml(group.personName) + '</span>' +
                typeBadge +
                badgeHtml +
                '<span class="text-muted small ms-1"><i class="fa-solid fa-calendar me-1"></i>สั่ง: ' + group.date + (group.time ? ' ' + group.time : '') + '</span>' +
                '<span class="fw-bold small ms-1 text-primary"><i class="fa-solid fa-truck me-1"></i>กำหนดส่ง: ' + group.expectedDate + '</span>' +
                (group.licensePlate ? '<span class="badge bg-light text-dark border ms-1"><i class="fa-solid fa-car me-1"></i>' + escapeHtml(group.licensePlate) + '</span>' : '') +
            '</div>' +
            '<div class="d-flex align-items-center gap-2">' +
                '<span class="text-muted small me-2">' + group.items.length + ' รายการ (' + totalQty + ' ชิ้น)</span>' +
                (group.batchId ? '<button type="button" class="btn btn-sm btn-success" data-receive-due-batch="' + group.batchId + '" data-person="' + group.personId + '" title="ทำเครื่องหมายว่ารับของทั้งหมดในชุดนี้แล้ว">' +
                    '<i class="fa-solid fa-check-double me-1"></i>รับทั้งชุด' +
                '</button>' : '') +
                '<button type="button" class="btn btn-sm btn-outline-primary" data-goto-person="' + group.personId + '" title="ไปที่หน้ารายการของ ' + escapeHtml(group.personName) + '">' +
                    '<i class="fa-solid fa-arrow-up-right-from-square me-1"></i>ไปที่คนนี้' +
                '</button>' +
            '</div>';

        groupCard.appendChild(header);

        if (group.note) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'px-3 py-2 bg-light border-bottom small text-muted';
            noteDiv.innerHTML = '<i class="fa-solid fa-note-sticky me-1 text-warning"></i>หมายเหตุการสั่ง: ' + escapeHtml(group.note);
            groupCard.appendChild(noteDiv);
        }

        // Table
        const table = document.createElement('table');
        table.className = 'table table-hover table-sm align-middle mb-0';
        table.innerHTML =
            '<thead>' +
            '<tr class="custom-table-header">' +
            '<th class="py-2 ps-3" style="width: 50px;">#</th>' +
            '<th class="py-2">หมายเลขอะไหล่</th>' +
            '<th class="py-2">ชื่ออะไหล่</th>' +
            '<th class="py-2 text-center" style="width: 80px;">จำนวน</th>' +
            '<th class="py-2">หมายเหตุอะไหล่</th>' +
            '<th class="py-2 text-center" style="width: 140px;">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody></tbody>';

        const tbody = table.querySelector('tbody');
        group.items.forEach(function (item, idx) {
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="ps-3 fw-medium text-muted">' + (idx + 1) + '</td>' +
                '<td class="fw-bold text-primary">' + escapeHtml(item.partNo) + '</td>' +
                '<td>' + escapeHtml(item.partName || '-') + '</td>' +
                '<td class="text-center fw-bold">' + item.qty + '</td>' +
                '<td class="text-muted small">' + escapeHtml(item.itemNote || '-') + '</td>' +
                '<td class="text-center">' +
                '<button type="button" class="btn btn-sm btn-outline-success" data-receive-due-item="' + item.id + '" data-person="' + group.personId + '" title="ทำเครื่องหมายว่ารับของชิ้นนี้แล้ว">' +
                '<i class="fa-solid fa-check me-1"></i>รับของแล้ว' +
                '</button>' +
                '</td>';
            tbody.appendChild(tr);
        });

        groupCard.appendChild(table);
        container.appendChild(groupCard);
    });
}

function markItemReceivedInDue(itemId, personId) {
    const list = ordersCache[personId] || [];
    const item = list.find(function (x) { return x.id === itemId; });
    if (!item) return;

    item.received = true;
    item.receivedDate = todayTh();

    database.ref('orders/' + personId).set(list).then(function () {
        loadDueAlerts();
    }).catch(function (err) {
        console.error('Error updating order:', err);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    });
}

function markBatchReceivedInDue(batchId, personId) {
    if (!confirm('ยืนยันว่ารับของทั้งหมดในชุดนี้แล้วหรือไม่?')) return;

    const list = ordersCache[personId] || [];
    let updated = false;

    list.forEach(function (item) {
        if (item.batchId === batchId) {
            item.received = true;
            item.receivedDate = todayTh();
            updated = true;
        }
    });

    if (!updated) return;

    database.ref('orders/' + personId).set(list).then(function () {
        loadDueAlerts();
    }).catch(function (err) {
        console.error('Error updating batch:', err);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
    });
}

function setupDueAlertsListeners() {
    const refreshBtn = document.getElementById('btn-refresh-due-alerts');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function () {
            loadDueAlerts();
        });
    }

    const searchBox = document.getElementById('due-search-box');
    if (searchBox) {
        searchBox.addEventListener('input', function (e) {
            dueAlertsSearchQuery = e.target.value;
            loadDueAlerts();
        });
    }

    const personFilter = document.getElementById('due-person-filter');
    if (personFilter) {
        personFilter.addEventListener('change', function (e) {
            dueAlertsFilterPerson = e.target.value;
            loadDueAlerts();
        });
    }

    const container = document.getElementById('due-alerts-container');
    if (container) {
        container.addEventListener('click', function (e) {
            const receiveItemBtn = e.target.closest('[data-receive-due-item]');
            if (receiveItemBtn) {
                const itemId = receiveItemBtn.dataset.receiveDueItem;
                const personId = receiveItemBtn.dataset.person;
                markItemReceivedInDue(itemId, personId);
                return;
            }

            const receiveBatchBtn = e.target.closest('[data-receive-due-batch]');
            if (receiveBatchBtn) {
                const batchId = receiveBatchBtn.dataset.receiveDueBatch;
                const personId = receiveBatchBtn.dataset.person;
                markBatchReceivedInDue(batchId, personId);
                return;
            }

            const gotoPersonBtn = e.target.closest('[data-goto-person]');
            if (gotoPersonBtn) {
                const personId = gotoPersonBtn.dataset.gotoPerson;
                openPerson(personId);
                showMenu('list');
                return;
            }
        });
    }
}

/* ==========================================================================
   Calendar & Thai Public Holidays & Daily Notes System
   ========================================================================== */

const THAI_MONTH_NAMES = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_DAY_NAMES = [
    'วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์'
];

let calCurrentDate = new Date();
let calendarNotesCache = {};
let isCalInitialized = false;
let currentCalView = 'general'; // 'general', 'nik', 'som'

// Personal Attendance Cache
let attendanceCache = {
    nik: {},
    som: {}
};

// Fixed Thai Public Holidays (MM-DD)
const THAI_FIXED_HOLIDAYS = {
    '01-01': 'วันขึ้นปีใหม่',
    '04-06': 'วันจักรี',
    '04-13': 'วันสงกรานต์',
    '04-14': 'วันสงกรานต์ (วันครอบครัว)',
    '04-15': 'วันสงกรานต์',
    '05-01': 'วันแรงงานแห่งชาติ',
    '05-04': 'วันฉัตรมงคล',
    '06-03': 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี',
    '07-28': 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว (ร.10)',
    '08-12': 'วันแม่แห่งชาติ',
    '10-13': 'วันนวมินทรมหาราช',
    '10-23': 'วันปิยมหาราช',
    '12-05': 'วันพ่อแห่งชาติ / วันชาติ',
    '12-10': 'วันรัฐธรรมนูญ',
    '12-31': 'วันสิ้นปี'
};

// Variable / Lunar Buddhist Holidays by Year (YYYY-MM-DD)
const THAI_VARIABLE_HOLIDAYS = {
    // 2024
    '2024-02-24': 'วันมาฆบูชา',
    '2024-02-26': 'ชดเชยวันมาฆบูชา',
    '2024-05-22': 'วันวิสาขบูชา',
    '2024-07-20': 'วันอาสาฬหบูชา',
    '2024-07-21': 'วันเข้าพรรษา',
    '2024-07-22': 'ชดเชยวันอาสาฬหบูชา',

    // 2025
    '2025-02-12': 'วันมาฆบูชา',
    '2025-05-11': 'วันวิสาขบูชา',
    '2025-05-12': 'ชดเชยวันวิสาขบูชา',
    '2025-07-10': 'วันอาสาฬหบูชา',
    '2025-07-11': 'วันเข้าพรรษา',

    // 2026
    '2026-03-03': 'วันมาฆบูชา',
    '2026-05-31': 'วันวิสาขบูชา',
    '2026-06-01': 'ชดเชยวันวิสาขบูชา',
    '2026-07-29': 'วันอาสาฬหบูชา',
    '2026-07-30': 'วันเข้าพรรษา',

    // 2027
    '2027-02-21': 'วันมาฆบูชา',
    '2027-02-22': 'ชดเชยวันมาฆบูชา',
    '2027-05-20': 'วันวิสาขบูชา',
    '2027-07-18': 'วันอาสาฬหบูชา',
    '2027-07-19': 'ชดเชยวันอาสาฬหบูชา',
    '2027-07-20': 'วันเข้าพรรษา',

    // 2028
    '2028-02-09': 'วันมาฆบูชา',
    '2028-05-08': 'วันวิสาขบูชา',
    '2028-07-06': 'วันอาสาฬหบูชา',
    '2028-07-07': 'วันเข้าพรรษา'
};

function formatCalDateYMD(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function getThaiHolidaysForYear(year) {
    const holidays = {};

    // 1. Fixed holidays + automatic weekend substitution
    Object.keys(THAI_FIXED_HOLIDAYS).forEach(function (mmdd) {
        const dateStr = year + '-' + mmdd;
        const name = THAI_FIXED_HOLIDAYS[mmdd];
        holidays[dateStr] = name;

        // Weekend substitution check (exclude Songkran multi-day holiday block)
        if (mmdd !== '04-13' && mmdd !== '04-14' && mmdd !== '04-15') {
            const m = parseInt(mmdd.substring(0, 2), 10) - 1;
            const dayNum = parseInt(mmdd.substring(3, 5), 10);
            const d = new Date(year, m, dayNum);
            const dow = d.getDay();
            if (dow === 6) { // Saturday -> Substitute on Monday (+2)
                const subDate = new Date(year, m, dayNum + 2);
                const subStr = formatCalDateYMD(subDate);
                if (!holidays[subStr]) holidays[subStr] = 'ชดเชย' + name;
            } else if (dow === 0) { // Sunday -> Substitute on Monday (+1)
                const subDate = new Date(year, m, dayNum + 1);
                const subStr = formatCalDateYMD(subDate);
                if (!holidays[subStr]) holidays[subStr] = 'ชดเชย' + name;
            }
        }
    });

    // Special Songkran substitution
    const songkranSat = [13, 14, 15].filter(function (d) {
        return new Date(year, 3, d).getDay() === 6;
    }).length;
    const songkranSun = [13, 14, 15].filter(function (d) {
        return new Date(year, 3, d).getDay() === 0;
    }).length;
    if (songkranSat + songkranSun > 0) {
        const sub1 = formatCalDateYMD(new Date(year, 3, 16));
        if (!holidays[sub1]) holidays[sub1] = 'ชดเชยวันสงกรานต์';
        if (songkranSat + songkranSun > 1) {
            const sub2 = formatCalDateYMD(new Date(year, 3, 17));
            if (!holidays[sub2]) holidays[sub2] = 'ชดเชยวันสงกรานต์';
        }
    }

    // 2. Variable Buddhist holidays
    Object.keys(THAI_VARIABLE_HOLIDAYS).forEach(function (dateStr) {
        if (dateStr.startsWith(year + '-')) {
            holidays[dateStr] = THAI_VARIABLE_HOLIDAYS[dateStr];
        }
    });

    return holidays;
}

function initCalendarView() {
    if (isCalInitialized) {
        renderCalendar();
        return;
    }
    isCalInitialized = true;

    // Populate Year and Month Selectors
    const monthSelect = document.getElementById('cal-select-month');
    const yearSelect = document.getElementById('cal-select-year');

    if (monthSelect) {
        monthSelect.innerHTML = '';
        THAI_MONTH_NAMES.forEach(function (name, index) {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = name;
            monthSelect.appendChild(opt);
        });
    }

    if (yearSelect) {
        yearSelect.innerHTML = '';
        const curYear = new Date().getFullYear();
        for (let y = curYear - 2; y <= curYear + 4; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = (y + 543) + ' (' + y + ')';
            yearSelect.appendChild(opt);
        }
    }

    // Attach Event Listeners for Personal Mode Sub-tabs (Protected with PIN)
    document.querySelectorAll('.cal-mode-navigation [data-cal-view]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            requestCalendarViewMode(btn.dataset.calView);
        });
    });

    // Month & Year Navigators
    const prevBtn = document.getElementById('cal-prev-month');
    if (prevBtn) {
        prevBtn.addEventListener('click', function () {
            calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
            renderCalendar();
        });
    }

    const nextBtn = document.getElementById('cal-next-month');
    if (nextBtn) {
        nextBtn.addEventListener('click', function () {
            calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
            renderCalendar();
        });
    }

    const todayBtn = document.getElementById('cal-today-btn');
    if (todayBtn) {
        todayBtn.addEventListener('click', function () {
            calCurrentDate = new Date();
            renderCalendar();
        });
    }

    if (monthSelect) {
        monthSelect.addEventListener('change', function () {
            calCurrentDate.setMonth(parseInt(monthSelect.value, 10));
            renderCalendar();
        });
    }

    if (yearSelect) {
        yearSelect.addEventListener('change', function () {
            calCurrentDate.setFullYear(parseInt(yearSelect.value, 10));
            renderCalendar();
        });
    }

    // Quick Add Note Button
    const quickAddBtn = document.getElementById('cal-btn-quick-add-note');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', function () {
            const todayStr = formatCalDateYMD(new Date());
            openCalendarDayModal(todayStr);
        });
    }

    // Modal Attendance Toggle Buttons & Boxes for Nik & Som
    document.querySelectorAll('.btn-attendance-toggle[data-person-work]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            const personKey = btn.dataset.personWork;
            const dateStr = document.getElementById('cal-note-selected-date').value || calSelectedDateStr;
            if (personKey && dateStr) {
                toggleWorkAttendance(personKey, dateStr);
            }
        });
    });

    ['nik', 'som'].forEach(function (personKey) {
        const box = document.getElementById('box-attendance-' + personKey);
        if (box) {
            box.style.cursor = 'pointer';
            box.addEventListener('click', function (e) {
                if (e.target.closest('.btn-attendance-toggle')) return;
                const dateStr = document.getElementById('cal-note-selected-date').value || calSelectedDateStr;
                if (dateStr) {
                    toggleWorkAttendance(personKey, dateStr);
                }
            });
        }
    });

    // Modal Close Buttons
    const closeModalBtn = document.getElementById('btn-close-cal-modal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeCalendarDayModal);
    }

    const calModal = document.getElementById('calendar-day-modal');
    if (calModal) {
        calModal.addEventListener('click', function (e) {
            if (e.target === calModal) closeCalendarDayModal();
        });
    }

    // Save Note Button
    const saveNoteBtn = document.getElementById('cal-btn-save-note');
    if (saveNoteBtn) {
        saveNoteBtn.addEventListener('click', saveCalendarNote);
    }

    // Cancel Edit Note Button
    const cancelEditBtn = document.getElementById('cal-btn-cancel-edit-note');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function () {
            resetCalendarNoteForm();
        });
    }

    // Calendar Grid Delegated Click Listener
    const daysGrid = document.getElementById('calendar-days-grid');
    if (daysGrid) {
        daysGrid.addEventListener('click', function (e) {
            // Check if user clicked quick attendance toggle icon
            const quickToggleBtn = e.target.closest('[data-toggle-work]');
            if (quickToggleBtn && (currentCalView === 'nik' || currentCalView === 'som')) {
                e.stopPropagation();
                toggleWorkAttendance(currentCalView, quickToggleBtn.dataset.toggleWork);
                return;
            }

            const dayCell = e.target.closest('.calendar-day-cell');
            if (dayCell && dayCell.dataset.date) {
                openCalendarDayModal(dayCell.dataset.date);
            }
        });
    }

    // Modal Notes List Delegated Actions (Edit & Delete)
    const modalNotesList = document.getElementById('cal-modal-notes-list');
    if (modalNotesList) {
        modalNotesList.addEventListener('click', function (e) {
            const editBtn = e.target.closest('[data-edit-cal-note]');
            const delBtn = e.target.closest('[data-del-cal-note]');

            if (editBtn) {
                const noteId = editBtn.dataset.editCalNote;
                editCalendarNote(noteId);
                return;
            }

            if (delBtn) {
                const noteId = delBtn.dataset.delCalNote;
                deleteCalendarNote(noteId);
                return;
            }
        });
    }

    // Load initial notes & attendance
    loadCalendarNotes();
    loadAttendanceData();
}

function setCalendarViewMode(mode) {
    currentCalView = mode;

    // Update active state in sub-tabs
    document.querySelectorAll('.cal-mode-navigation [data-cal-view]').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.calView === mode);
    });

    const headerTitle = document.getElementById('calendar-header-title');
    const headerBadge = document.getElementById('calendar-header-badge');
    const headerSub = document.getElementById('calendar-header-subtitle');
    const headerIcon = document.getElementById('calendar-header-icon');
    const headerIconBox = document.getElementById('calendar-header-icon-box');

    const chipWorkNik = document.getElementById('chip-work-nik');
    const chipWorkSom = document.getElementById('chip-work-som');
    const legendNik = document.getElementById('legend-item-nik');
    const legendSom = document.getElementById('legend-item-som');

    if (mode === 'nik') {
        if (headerTitle) headerTitle.textContent = 'ปฏิทินส่วนตัวของนิก';
        if (headerBadge) {
            headerBadge.innerHTML = '<i class="fa-solid fa-user-check me-1"></i>เช็ควันมาทำงาน & สรุปวันทำงานของนิก';
            headerBadge.className = 'badge rounded-pill cal-feature-badge bg-primary-subtle text-primary border border-primary-subtle';
        }
        if (headerSub) headerSub.textContent = 'คลิกวันที่เพื่อบันทึกว่ามาทำงาน และสรุปผลรวมวันที่มาทำงานทั้งหมดของนิก';
        if (headerIcon) headerIcon.className = 'fa-solid fa-user-check';
        if (headerIconBox) headerIconBox.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';

        if (chipWorkNik) chipWorkNik.classList.remove('hidden');
        if (chipWorkSom) chipWorkSom.classList.add('hidden');
        if (legendNik) legendNik.classList.remove('hidden');
        if (legendSom) legendSom.classList.add('hidden');
    } else if (mode === 'som') {
        if (headerTitle) headerTitle.textContent = 'ปฏิทินส่วนตัวของส้ม';
        if (headerBadge) {
            headerBadge.innerHTML = '<i class="fa-solid fa-user-tag me-1"></i>เช็ควันมาทำงาน & สรุปวันทำงานของส้ม';
            headerBadge.className = 'badge rounded-pill cal-feature-badge bg-warning-subtle text-warning-emphasis border border-warning-subtle';
        }
        if (headerSub) headerSub.textContent = 'คลิกวันที่เพื่อบันทึกว่ามาทำงาน และสรุปผลรวมวันที่มาทำงานทั้งหมดของส้ม';
        if (headerIcon) headerIcon.className = 'fa-solid fa-user-tag';
        if (headerIconBox) headerIconBox.style.background = 'linear-gradient(135deg, #d97706, #b45309)';

        if (chipWorkNik) chipWorkNik.classList.add('hidden');
        if (chipWorkSom) chipWorkSom.classList.remove('hidden');
        if (legendNik) legendNik.classList.add('hidden');
        if (legendSom) legendSom.classList.remove('hidden');
    } else {
        // General Mode: Clean calendar view without personal attendance names
        if (headerTitle) headerTitle.textContent = 'ปฏิทิน & วันหยุดนักขัตฤกษ์';
        if (headerBadge) {
            headerBadge.innerHTML = '<i class="fa-solid fa-note-sticky me-1"></i>บันทึก Note ประจำวันได้';
            headerBadge.className = 'badge rounded-pill cal-feature-badge';
        }
        if (headerSub) headerSub.textContent = 'แสดงวันหยุดราชการไทย พร้อมระบบจดบันทึกงานประจำวัน';
        if (headerIcon) headerIcon.className = 'fa-solid fa-calendar-days';
        if (headerIconBox) headerIconBox.style.background = 'linear-gradient(135deg, #2563eb, #1d4ed8)';

        if (chipWorkNik) chipWorkNik.classList.add('hidden');
        if (chipWorkSom) chipWorkSom.classList.add('hidden');
        if (legendNik) legendNik.classList.add('hidden');
        if (legendSom) legendSom.classList.add('hidden');
    }

    renderCalendar();
}

function normalizeAttendanceMap(rawObj) {
    if (!rawObj || typeof rawObj !== 'object') return {};
    const normalized = {};
    Object.keys(rawObj).forEach(function (k) {
        const standardKey = k.replace(/_/g, '-');
        if (rawObj[k] && rawObj[k].attended) {
            normalized[standardKey] = rawObj[k];
            normalized[standardKey].date = standardKey;
        }
    });
    return normalized;
}

function loadAttendanceData() {
    // 1. Load from LocalStorage
    try {
        const localNik = localStorage.getItem('isuzu_attendance_nik');
        if (localNik) attendanceCache.nik = normalizeAttendanceMap(JSON.parse(localNik));

        const localSom = localStorage.getItem('isuzu_attendance_som');
        if (localSom) attendanceCache.som = normalizeAttendanceMap(JSON.parse(localSom));
    } catch (e) {
        console.warn('LocalStorage error loading attendance:', e);
    }

    // 2. Realtime sync with Firebase
    try {
        if (typeof database !== 'undefined') {
            database.ref('calendarAttendance').on('value', function (snapshot) {
                const data = snapshot.val();
                if (data) {
                    attendanceCache.nik = normalizeAttendanceMap(data.nik || {});
                    attendanceCache.som = normalizeAttendanceMap(data.som || {});

                    try {
                        localStorage.setItem('isuzu_attendance_nik', JSON.stringify(attendanceCache.nik));
                        localStorage.setItem('isuzu_attendance_som', JSON.stringify(attendanceCache.som));
                    } catch (err) {}
                }
                renderCalendar();

                // If modal is currently open, update modal UI
                const modal = document.getElementById('calendar-day-modal');
                const selectedDateInput = document.getElementById('cal-note-selected-date');
                if (modal && !modal.classList.contains('hidden') && selectedDateInput && selectedDateInput.value) {
                    updateModalAttendanceUI(selectedDateInput.value);
                }
            }, function (error) {
                console.warn('Firebase attendance sync error:', error);
            });
        }
    } catch (e) {
        console.warn('Firebase attendance setup error:', e);
    }
}

function toggleWorkAttendance(personKey, dateStr) {
    if (!personKey || !dateStr) return;
    if (!attendanceCache[personKey]) attendanceCache[personKey] = {};

    const isAttended = !!(attendanceCache[personKey][dateStr] && attendanceCache[personKey][dateStr].attended);
    const newStatus = !isAttended;

    if (newStatus) {
        attendanceCache[personKey][dateStr] = {
            attended: true,
            date: dateStr,
            person: personKey,
            timestamp: new Date().toISOString()
        };
    } else {
        delete attendanceCache[personKey][dateStr];
    }

    // Save to LocalStorage
    try {
        localStorage.setItem('isuzu_attendance_' + personKey, JSON.stringify(attendanceCache[personKey]));
    } catch (e) {}

    // Save to Firebase
    if (typeof database !== 'undefined') {
        const standardRef = database.ref('calendarAttendance/' + personKey + '/' + dateStr);
        const legacyRef = database.ref('calendarAttendance/' + personKey + '/' + dateStr.replace(/-/g, '_'));

        if (newStatus) {
            standardRef.set(attendanceCache[personKey][dateStr]).catch(function (err) {
                console.warn('Firebase attendance update error:', err);
            });
        } else {
            standardRef.remove().catch(function (err) {
                console.warn('Firebase attendance remove error:', err);
            });
            legacyRef.remove().catch(function () {});
        }
    }

    updateModalAttendanceUI(dateStr);
    renderCalendar();
}

function getAttendanceStats(personKey, year, month) {
    const data = attendanceCache[personKey] || {};
    let totalCount = 0;
    let monthCount = 0;

    const padMonth = String(month + 1).padStart(2, '0');
    const monthPrefix = year + '-' + padMonth;

    Object.keys(data).forEach(function (dateStr) {
        if (data[dateStr] && data[dateStr].attended) {
            totalCount++;
            if (dateStr.startsWith(monthPrefix)) {
                monthCount++;
            }
        }
    });

    return { monthCount: monthCount, totalCount: totalCount };
}

function updateModalAttendanceUI(dateStr) {
    const panel = document.getElementById('cal-modal-attendance-panel');
    if (!panel) return;

    // In General Calendar mode, hide personal attendance panel completely
    if (currentCalView !== 'nik' && currentCalView !== 'som') {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');

    const titleEl = document.getElementById('cal-modal-attendance-title');
    const colNik = document.getElementById('col-attendance-nik');
    const colSom = document.getElementById('col-attendance-som');

    if (currentCalView === 'nik') {
        if (titleEl) titleEl.textContent = 'บันทึกการมาทำงานของนิก';
        if (colNik) colNik.classList.remove('hidden');
        if (colSom) colSom.classList.add('hidden');

        const isNikAttended = !!(attendanceCache.nik && attendanceCache.nik[dateStr] && attendanceCache.nik[dateStr].attended);
        const boxNik = document.getElementById('box-attendance-nik');
        const badgeNik = document.getElementById('badge-attendance-nik');
        const btnNik = document.getElementById('btn-work-nik');

        if (boxNik) {
            boxNik.classList.toggle('is-checked', isNikAttended);
        }
        if (badgeNik) {
            if (isNikAttended) {
                badgeNik.className = 'badge bg-success text-white attendance-pill';
                badgeNik.innerHTML = '<i class="fa-solid fa-check me-1"></i>มาทำงานแล้ว';
            } else {
                badgeNik.className = 'badge bg-secondary text-white attendance-pill';
                badgeNik.textContent = 'ยังไม่ได้บันทึก';
            }
        }
        if (btnNik) {
            if (isNikAttended) {
                btnNik.className = 'btn btn-sm w-100 btn-success btn-attendance-toggle is-active';
                btnNik.innerHTML = '<i class="fa-solid fa-check-double me-1"></i><span id="text-work-nik">✓ มาทำงานแล้ว (คลิกยกเลิก)</span>';
            } else {
                btnNik.className = 'btn btn-sm w-100 btn-outline-primary btn-attendance-toggle';
                btnNik.innerHTML = '<i class="fa-solid fa-calendar-check me-1"></i><span id="text-work-nik">บันทึกว่ามาทำงาน</span>';
            }
        }
    } else if (currentCalView === 'som') {
        if (titleEl) titleEl.textContent = 'บันทึกการมาทำงานของส้ม';
        if (colSom) colSom.classList.remove('hidden');
        if (colNik) colNik.classList.add('hidden');

        const isSomAttended = !!(attendanceCache.som && attendanceCache.som[dateStr] && attendanceCache.som[dateStr].attended);
        const boxSom = document.getElementById('box-attendance-som');
        const badgeSom = document.getElementById('badge-attendance-som');
        const btnSom = document.getElementById('btn-work-som');

        if (boxSom) {
            boxSom.classList.toggle('is-checked', isSomAttended);
        }
        if (badgeSom) {
            if (isSomAttended) {
                badgeSom.className = 'badge bg-warning text-dark attendance-pill fw-bold';
                badgeSom.innerHTML = '<i class="fa-solid fa-check me-1"></i>มาทำงานแล้ว';
            } else {
                badgeSom.className = 'badge bg-secondary text-white attendance-pill';
                badgeSom.textContent = 'ยังไม่ได้บันทึก';
            }
        }
        if (btnSom) {
            if (isSomAttended) {
                btnSom.className = 'btn btn-sm w-100 btn-warning text-dark fw-bold btn-attendance-toggle is-active';
                btnSom.innerHTML = '<i class="fa-solid fa-check-double me-1"></i><span id="text-work-som">✓ มาทำงานแล้ว (คลิกยกเลิก)</span>';
            } else {
                btnSom.className = 'btn btn-sm w-100 btn-outline-warning btn-attendance-toggle';
                btnSom.innerHTML = '<i class="fa-solid fa-calendar-check me-1"></i><span id="text-work-som">บันทึกว่ามาทำงาน</span>';
            }
        }
    }
}

function loadCalendarNotes() {
    // 1. Try loading from LocalStorage first for instant render
    try {
        const local = localStorage.getItem('isuzu_calendar_notes');
        if (local) {
            calendarNotesCache = JSON.parse(local) || {};
        }
    } catch (e) {
        console.warn('LocalStorage error loading calendar notes:', e);
    }

    renderCalendar();

    // 2. Realtime sync from Firebase if available
    try {
        if (typeof database !== 'undefined') {
            database.ref('calendarNotes').on('value', function (snapshot) {
                const data = snapshot.val();
                if (data) {
                    calendarNotesCache = data;
                    try {
                        localStorage.setItem('isuzu_calendar_notes', JSON.stringify(data));
                    } catch (err) {}
                } else if (!data) {
                    calendarNotesCache = {};
                }
                renderCalendar();

                // If modal is open, re-render modal notes
                const modal = document.getElementById('calendar-day-modal');
                const selectedDateInput = document.getElementById('cal-note-selected-date');
                if (modal && !modal.classList.contains('hidden') && selectedDateInput && selectedDateInput.value) {
                    renderModalNotesList(selectedDateInput.value);
                }
            }, function (error) {
                console.warn('Firebase calendarNotes error:', error);
            });
        }
    } catch (e) {
        console.warn('Firebase setup error for calendarNotes:', e);
    }
}

function renderCalendar() {
    const grid = document.getElementById('calendar-days-grid');
    if (!grid) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();

    // Update Selectors
    const monthSelect = document.getElementById('cal-select-month');
    const yearSelect = document.getElementById('cal-select-year');
    if (monthSelect) monthSelect.value = month;
    if (yearSelect) yearSelect.value = year;

    // Get Thai Holidays for this year
    const holidays = getThaiHolidaysForYear(year);

    // Days in current month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 6 = Sat

    // Days from previous month to fill first row
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    grid.innerHTML = '';

    const todayStr = formatCalDateYMD(new Date());
    let monthHolidaysCount = 0;
    let monthNotesCount = 0;

    // Calculate attendance stats exclusively for active personal view
    if (currentCalView === 'nik') {
        const nikStats = getAttendanceStats('nik', year, month);
        const nikMonthEl = document.getElementById('cal-stat-nik-month');
        const nikTotalEl = document.getElementById('cal-stat-nik-total');
        if (nikMonthEl) nikMonthEl.textContent = nikStats.monthCount;
        if (nikTotalEl) nikTotalEl.textContent = nikStats.totalCount;
    } else if (currentCalView === 'som') {
        const somStats = getAttendanceStats('som', year, month);
        const somMonthEl = document.getElementById('cal-stat-som-month');
        const somTotalEl = document.getElementById('cal-stat-som-total');
        if (somMonthEl) somMonthEl.textContent = somStats.monthCount;
        if (somTotalEl) somTotalEl.textContent = somStats.totalCount;
    }

    // 1. Previous month padded days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const dayNum = prevMonthLastDay - i;
        const prevDate = new Date(year, month - 1, dayNum);
        const dateStr = formatCalDateYMD(prevDate);
        const cell = createCalendarDayCell(prevDate, dateStr, dayNum, true, holidays);
        grid.appendChild(cell);
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const curDate = new Date(year, month, day);
        const dateStr = formatCalDateYMD(curDate);
        const isHoliday = !!holidays[dateStr];
        const dayNotes = getNotesForDate(dateStr);

        if (isHoliday) monthHolidaysCount++;
        monthNotesCount += dayNotes.length;

        const cell = createCalendarDayCell(curDate, dateStr, day, false, holidays);
        grid.appendChild(cell);
    }

    // 3. Next month padded days to complete grid
    const totalCells = startingDayOfWeek + daysInMonth;
    const totalGridSlots = totalCells <= 35 ? 35 : 42;
    const remainingSlots = totalGridSlots - totalCells;

    for (let day = 1; day <= remainingSlots; day++) {
        const nextDate = new Date(year, month + 1, day);
        const dateStr = formatCalDateYMD(nextDate);
        const cell = createCalendarDayCell(nextDate, dateStr, day, true, holidays);
        grid.appendChild(cell);
    }

    // Update stats bar
    const holidayStat = document.getElementById('cal-stat-holidays');
    if (holidayStat) holidayStat.textContent = monthHolidaysCount;

    const noteStat = document.getElementById('cal-stat-notes');
    if (noteStat) noteStat.textContent = monthNotesCount;
}

function getNotesForDate(dateStr) {
    if (!calendarNotesCache) return [];
    return Object.keys(calendarNotesCache)
        .map(function (k) { return calendarNotesCache[k]; })
        .filter(function (n) {
            if (!n || n.date !== dateStr) return false;
            return true;
        })
        .sort(function (a, b) { return (a.createdAt || '').localeCompare(b.createdAt || ''); });
}

function createCalendarDayCell(dateObj, dateStr, dayNum, isOtherMonth, holidays) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.dataset.date = dateStr;

    const todayStr = formatCalDateYMD(new Date());
    const isToday = (dateStr === todayStr);
    const holidayName = holidays[dateStr];
    const notes = getNotesForDate(dateStr);

    // Personal Attendance Check (Only for the active personal calendar)
    let isAttended = false;
    if (currentCalView === 'nik') {
        isAttended = !!(attendanceCache.nik && attendanceCache.nik[dateStr] && attendanceCache.nik[dateStr].attended);
    } else if (currentCalView === 'som') {
        isAttended = !!(attendanceCache.som && attendanceCache.som[dateStr] && attendanceCache.som[dateStr].attended);
    }

    if (isOtherMonth) cell.classList.add('other-month');
    if (isToday) cell.classList.add('is-today');
    if (holidayName) cell.classList.add('is-holiday');
    if (isAttended) cell.classList.add('is-attended-day');
    if (notes.length > 0) cell.classList.add('has-notes');

    // Day Cell Inner Header
    let cellHtml =
        '<div class="day-cell-header">' +
            '<span class="day-number' + (isToday ? ' today-number' : '') + '">' + dayNum + '</span>' +
            '<div class="d-flex align-items-center gap-1">' +
                (currentCalView === 'nik' && isAttended ? '<span class="attended-header-pill" title="นิกมาทำงานแล้ว"><i class="fa-solid fa-check"></i></span>' : '') +
                (currentCalView === 'som' && isAttended ? '<span class="attended-header-pill" style="background:#f59e0b;" title="ส้มมาทำงานแล้ว"><i class="fa-solid fa-check"></i></span>' : '') +
                (isToday ? '<span class="today-badge">วันนี้</span>' : '') +
            '</div>' +
        '</div>';

    // Day Content
    cellHtml += '<div class="day-cell-content">';

    // Show Attendance Badge exclusively in personal view
    if (currentCalView === 'nik' && isAttended) {
        cellHtml +=
            '<div class="cal-attendance-badge" title="บันทึกว่ามาทำงานแล้ว">' +
                '<i class="fa-solid fa-circle-check me-1"></i>มาทำงาน' +
            '</div>';
    } else if (currentCalView === 'som' && isAttended) {
        cellHtml +=
            '<div class="cal-attendance-badge" style="background:#fef3c7;border-color:#fde68a;color:#92400e;" title="บันทึกว่ามาทำงานแล้ว">' +
                '<i class="fa-solid fa-circle-check me-1"></i>มาทำงาน' +
            '</div>';
    }

    if (holidayName) {
        cellHtml +=
            '<div class="cal-holiday-tag" title="' + escapeHtml(holidayName) + '">' +
                '<i class="fa-solid fa-flag me-1"></i>' + escapeHtml(holidayName) +
            '</div>';
    }

    if (notes.length > 0) {
        const maxChips = isAttended ? 1 : 2;
        notes.slice(0, maxChips).forEach(function (note) {
            const catBadge = getCategoryBadgeStyle(note.category);
            cellHtml +=
                '<div class="cal-note-chip ' + catBadge.className + '" title="' + escapeHtml(note.text) + '">' +
                    catBadge.icon + ' ' + escapeHtml(note.text) +
                '</div>';
        });

        if (notes.length > maxChips) {
            cellHtml +=
                '<div class="cal-note-more-badge">+' + (notes.length - maxChips) + ' รายการ</div>';
        }
    }

    cellHtml += '</div>';

    // Action button on cell
    if (currentCalView === 'nik' || currentCalView === 'som') {
        cellHtml +=
            '<button type="button" class="day-cell-work-toggle ' + (isAttended ? 'is-active' : '') + '" data-toggle-work="' + dateStr + '" title="' + (isAttended ? 'ยกเลิกมาทำงาน' : 'ติ๊กมาทำงาน') + '">' +
                '<i class="fa-solid ' + (isAttended ? 'fa-check' : 'fa-plus') + '"></i>' +
            '</button>';
    } else {
        cellHtml += '<button type="button" class="day-cell-add-btn" title="เพิ่ม Note"><i class="fa-solid fa-plus"></i></button>';
    }

    cell.innerHTML = cellHtml;
    return cell;
}

function getCategoryBadgeStyle(category) {
    switch (category) {
        case 'order':
            return { className: 'cat-order', icon: '<i class="fa-solid fa-box"></i>', label: 'สั่งของ' };
        case 'urgent':
            return { className: 'cat-urgent', icon: '<i class="fa-solid fa-bolt"></i>', label: 'ด่วน' };
        case 'appointment':
            return { className: 'cat-appointment', icon: '<i class="fa-solid fa-handshake"></i>', label: 'นัดหมาย' };
        case 'leave':
            return { className: 'cat-leave', icon: '<i class="fa-solid fa-umbrella-beach"></i>', label: 'ลาหยุด' };
        default:
            return { className: 'cat-general', icon: '<i class="fa-solid fa-thumbtack"></i>', label: 'ทั่วไป' };
    }
}

function openCalendarDayModal(dateStr) {
    calSelectedDateStr = dateStr;
    const modal = document.getElementById('calendar-day-modal');
    if (!modal) return;

    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    // Formatted Thai Title: "วันจันทร์ที่ 12 ตุลาคม 2569"
    const thaiDayName = THAI_DAY_NAMES[d.getDay()];
    const thaiMonthName = THAI_MONTH_NAMES[month];
    const thaiYear = year + 543;
    const titleText = thaiDayName + 'ที่ ' + day + ' ' + thaiMonthName + ' ' + thaiYear;

    const dateTitle = document.getElementById('cal-modal-date-title');
    if (dateTitle) {
        dateTitle.innerHTML = '<i class="fa-solid fa-calendar-day me-2 text-primary"></i>' + titleText;
    }

    // Holiday Check
    const holidays = getThaiHolidaysForYear(year);
    const holidayName = holidays[dateStr];
    const holidayBanner = document.getElementById('cal-modal-holiday-banner');
    const holidayNameEl = document.getElementById('cal-modal-holiday-name');

    if (holidayBanner && holidayNameEl) {
        if (holidayName) {
            holidayNameEl.textContent = 'วันหยุดนักขัตฤกษ์: ' + holidayName;
            holidayBanner.classList.remove('hidden');
        } else {
            holidayBanner.classList.add('hidden');
        }
    }

    // Set Date in hidden input
    document.getElementById('cal-note-selected-date').value = dateStr;

    // Update Attendance Section in Modal
    updateModalAttendanceUI(dateStr);

    // Reset Note Form
    resetCalendarNoteForm();

    // Render list of notes for this day
    renderModalNotesList(dateStr);

    // Show Modal
    modal.classList.remove('hidden');
}

function closeCalendarDayModal() {
    const modal = document.getElementById('calendar-day-modal');
    if (modal) modal.classList.add('hidden');
    resetCalendarNoteForm();
}

function renderModalNotesList(dateStr) {
    const container = document.getElementById('cal-modal-notes-list');
    const countSpan = document.getElementById('cal-modal-notes-count');
    if (!container) return;

    const notes = getNotesForDate(dateStr);
    if (countSpan) countSpan.textContent = notes.length;

    if (notes.length === 0) {
        container.innerHTML =
            '<div class="text-center text-muted py-4">' +
                '<i class="fa-solid fa-file-pen fa-2x mb-2 text-secondary opacity-50"></i>' +
                '<p class="small mb-0">ยังไม่มี Note บันทึกไว้ในวันนี้ คุณสามารถพิมพ์บันทึกใหม่ด้านล่างได้เลย</p>' +
            '</div>';
        return;
    }

    let html = '';
    notes.forEach(function (n) {
        const cat = getCategoryBadgeStyle(n.category);
        html +=
            '<div class="cal-modal-note-item p-3 mb-2" id="note-item-' + n.id + '">' +
                '<div class="d-flex justify-content-between align-items-start gap-2 mb-1">' +
                    '<div class="d-flex align-items-center gap-2 flex-wrap">' +
                        '<span class="cal-category-pill ' + cat.className + '">' +
                            cat.icon + ' ' + cat.label +
                        '</span>' +
                        (n.author ? '<span class="small fw-semibold text-primary"><i class="fa-solid fa-user me-1"></i>' + escapeHtml(n.author) + '</span>' : '') +
                        (n.time ? '<span class="small text-muted"><i class="fa-solid fa-clock me-1"></i>' + escapeHtml(n.time) + '</span>' : '') +
                    '</div>' +
                    '<div class="d-flex align-items-center gap-1">' +
                        '<button type="button" class="btn btn-sm btn-outline-primary btn-note-action" data-edit-cal-note="' + n.id + '" title="แก้ไข">' +
                            '<i class="fa-solid fa-pen"></i>' +
                        '</button>' +
                        '<button type="button" class="btn btn-sm btn-outline-danger btn-note-action" data-del-cal-note="' + n.id + '" title="ลบ">' +
                            '<i class="fa-solid fa-trash"></i>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                '<div class="cal-note-text-body mt-2">' + escapeHtml(n.text).replace(/\n/g, '<br>') + '</div>' +
            '</div>';
    });

    container.innerHTML = html;
}

function resetCalendarNoteForm() {
    editingCalNoteId = null;
    const formTitle = document.getElementById('cal-form-title');
    const inputEditId = document.getElementById('cal-note-edit-id');
    const inputText = document.getElementById('cal-note-input-text');
    const inputCategory = document.getElementById('cal-note-category');
    const inputAuthor = document.getElementById('cal-note-author');
    const btnCancel = document.getElementById('cal-btn-cancel-edit-note');
    const btnSave = document.getElementById('cal-btn-save-note');

    if (formTitle) formTitle.textContent = 'เพิ่ม Note ประจำวันนี้';
    if (inputEditId) inputEditId.value = '';
    if (inputText) inputText.value = '';
    if (inputCategory) inputCategory.value = 'general';
    if (inputAuthor) {
        if (currentCalView === 'nik') {
            inputAuthor.value = 'นิก';
        } else if (currentCalView === 'som') {
            inputAuthor.value = 'พี่ส้ม';
        } else if (currentPerson && PEOPLE && PEOPLE[currentPerson]) {
            inputAuthor.value = PEOPLE[currentPerson].name;
        } else {
            inputAuthor.value = '';
        }
    }
    if (btnCancel) btnCancel.classList.add('hidden');
    if (btnSave) btnSave.innerHTML = '<i class="fa-solid fa-check me-1"></i>บันทึก Note';
}

function editCalendarNote(noteId) {
    const note = calendarNotesCache[noteId];
    if (!note) return;

    editingCalNoteId = noteId;
    const formTitle = document.getElementById('cal-form-title');
    const inputEditId = document.getElementById('cal-note-edit-id');
    const inputText = document.getElementById('cal-note-input-text');
    const inputCategory = document.getElementById('cal-note-category');
    const inputAuthor = document.getElementById('cal-note-author');
    const btnCancel = document.getElementById('cal-btn-cancel-edit-note');
    const btnSave = document.getElementById('cal-btn-save-note');

    if (formTitle) formTitle.textContent = 'แก้ไข Note';
    if (inputEditId) inputEditId.value = noteId;
    if (inputText) {
        inputText.value = note.text;
        inputText.focus();
    }
    if (inputCategory) inputCategory.value = note.category || 'general';
    if (inputAuthor) inputAuthor.value = note.author || '';
    if (btnCancel) btnCancel.classList.remove('hidden');
    if (btnSave) btnSave.innerHTML = '<i class="fa-solid fa-check me-1"></i>อัปเดต Note';

    // Scroll form into view smoothly
    const formCard = document.querySelector('.calendar-form-card');
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function saveCalendarNote() {
    const dateStr = document.getElementById('cal-note-selected-date').value;
    const text = document.getElementById('cal-note-input-text').value.trim();
    const category = document.getElementById('cal-note-category').value;
    const author = document.getElementById('cal-note-author').value.trim();

    if (!text) {
        alert('กรุณากรอกข้อความ Note');
        document.getElementById('cal-note-input-text').focus();
        return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let noteId = editingCalNoteId;
    if (!noteId) {
        noteId = 'calnote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    }

    let defaultAuthor = 'ผู้ใช้';
    if (currentCalView === 'nik') defaultAuthor = 'นิก';
    else if (currentCalView === 'som') defaultAuthor = 'พี่ส้ม';
    else if (currentPerson && PEOPLE[currentPerson]) defaultAuthor = PEOPLE[currentPerson].name;

    const noteData = {
        id: noteId,
        date: dateStr,
        text: text,
        category: category,
        author: author || defaultAuthor,
        time: timeStr,
        updatedAt: now.toISOString()
    };

    if (!editingCalNoteId) {
        noteData.createdAt = now.toISOString();
    } else if (calendarNotesCache[noteId] && calendarNotesCache[noteId].createdAt) {
        noteData.createdAt = calendarNotesCache[noteId].createdAt;
    }

    // Update in Cache & LocalStorage
    calendarNotesCache[noteId] = noteData;
    try {
        localStorage.setItem('isuzu_calendar_notes', JSON.stringify(calendarNotesCache));
    } catch (e) {}

    // Update in Firebase if online
    if (typeof database !== 'undefined') {
        database.ref('calendarNotes/' + noteId).set(noteData).catch(function (err) {
            console.warn('Firebase save error:', err);
        });
    }

    resetCalendarNoteForm();
    renderModalNotesList(dateStr);
    renderCalendar();
}

function deleteCalendarNote(noteId) {
    if (!confirm('ยืนยันว่าต้องการลบ Note นี้?')) return;

    const dateStr = document.getElementById('cal-note-selected-date').value;

    delete calendarNotesCache[noteId];
    try {
        localStorage.setItem('isuzu_calendar_notes', JSON.stringify(calendarNotesCache));
    } catch (e) {}

    if (typeof database !== 'undefined') {
        database.ref('calendarNotes/' + noteId).remove().catch(function (err) {
            console.warn('Firebase delete error:', err);
        });
    }

    if (editingCalNoteId === noteId) {
        resetCalendarNoteForm();
    }

    renderModalNotesList(dateStr);
    renderCalendar();
}

/* ==========================================================================
   Security PIN Lock System
   - Web Entrance: PIN 0000 (Required every time the web app is entered/reloaded)
   - Nik Personal Calendar: PIN 1111 (Required each time entering Nik's personal calendar)
   - Som Personal Calendar: PIN 2222 (Required each time entering Som's personal calendar)
   ========================================================================== */

const WEB_ACCESS_PIN = '0000';
const NIK_CAL_PIN = '1111';
const SOM_CAL_PIN = '2222';

let isWebUnlocked = false;
let calUnlocked = {
    nik: false,
    som: false
};
let pendingCalViewMode = null;

// Clear any old stored sessions so every entry requires PIN
try {
    sessionStorage.removeItem('isuzu_web_unlocked');
    sessionStorage.removeItem('isuzu_cal_unlocked_nik');
    sessionStorage.removeItem('isuzu_cal_unlocked_som');
} catch (e) {}

function requestCalendarViewMode(mode) {
    if (mode === 'nik') {
        if (calUnlocked.nik) {
            setCalendarViewMode('nik');
        } else {
            openCalLockModal('nik');
        }
    } else if (mode === 'som') {
        if (calUnlocked.som) {
            setCalendarViewMode('som');
        } else {
            openCalLockModal('som');
        }
    } else {
        // Returning to General view locks personal calendars again for privacy
        calUnlocked.nik = false;
        calUnlocked.som = false;
        setCalendarViewMode('general');
    }
}

function lockWebApp() {
    isWebUnlocked = false;
    calUnlocked.nik = false;
    calUnlocked.som = false;
    const lockScreen = document.getElementById('web-lock-screen');
    const pinInput = document.getElementById('web-lock-pin-input');
    const errorEl = document.getElementById('web-lock-error');

    if (errorEl) errorEl.classList.add('hidden');
    if (pinInput) pinInput.value = '';
    if (lockScreen) lockScreen.classList.remove('unlocked');
    setTimeout(function () {
        if (pinInput) pinInput.focus();
    }, 200);
}

function initWebLock() {
    const lockScreen = document.getElementById('web-lock-screen');
    const pinInput = document.getElementById('web-lock-pin-input');
    const errorEl = document.getElementById('web-lock-error');
    const clearBtn = document.getElementById('btn-web-lock-clear');
    const submitBtn = document.getElementById('btn-web-lock-submit');
    const enterBtn = document.getElementById('btn-web-lock-enter');
    const lockBtn = document.getElementById('btn-lock-app');
    const lockCard = document.querySelector('.web-lock-card');

    if (!lockScreen) return;

    // Always strictly lock on every entry/load
    isWebUnlocked = false;
    lockScreen.classList.remove('unlocked');
    setTimeout(function () {
        if (pinInput) pinInput.focus();
    }, 250);

    function checkWebPin() {
        if (!pinInput) return;
        const val = pinInput.value.trim();
        if (val === WEB_ACCESS_PIN) {
            isWebUnlocked = true;
            if (errorEl) errorEl.classList.add('hidden');
            lockScreen.classList.add('unlocked');
        } else {
            if (errorEl) errorEl.classList.remove('hidden');
            if (lockCard) {
                lockCard.classList.remove('shake-anim');
                void lockCard.offsetWidth; // Force reflow
                lockCard.classList.add('shake-anim');
            }
            pinInput.value = '';
            pinInput.focus();
        }
    }

    // Keypad number buttons
    document.querySelectorAll('.web-pin-key[data-digit]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!pinInput) return;
            if (pinInput.value.length < 4) {
                pinInput.value += btn.dataset.digit;
            }
            if (pinInput.value.length === 4) {
                checkWebPin();
            }
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!pinInput) return;
            pinInput.value = pinInput.value.slice(0, -1);
            if (errorEl) errorEl.classList.add('hidden');
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function (e) {
            e.preventDefault();
            checkWebPin();
        });
    }

    if (enterBtn) {
        enterBtn.addEventListener('click', function (e) {
            e.preventDefault();
            checkWebPin();
        });
    }

    if (lockBtn) {
        lockBtn.addEventListener('click', function (e) {
            e.preventDefault();
            lockWebApp();
        });
    }

    if (pinInput) {
        pinInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length === 4) {
                checkWebPin();
            }
        });
        pinInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkWebPin();
            }
        });
    }

    // When page is hidden/closed, re-arm the lock
    window.addEventListener('pagehide', function () {
        lockWebApp();
    });
}

function initCalendarLock() {
    const modal = document.getElementById('cal-lock-modal');
    const pinInput = document.getElementById('cal-lock-pin-input');
    const errorEl = document.getElementById('cal-lock-error');
    const clearBtn = document.getElementById('btn-cal-lock-clear');
    const submitBtn = document.getElementById('btn-cal-lock-submit');
    const confirmBtn = document.getElementById('btn-cal-lock-confirm');
    const cancelBtn = document.getElementById('btn-cal-lock-cancel');
    const closeBtn = document.getElementById('btn-close-cal-lock');
    const modalContent = document.querySelector('.cal-lock-modal-content');

    if (!modal) return;

    function checkCalPin() {
        if (!pinInput || !pendingCalViewMode) return;
        const val = pinInput.value.trim();
        const expectedPin = (pendingCalViewMode === 'nik' ? NIK_CAL_PIN : SOM_CAL_PIN);

        if (val === expectedPin) {
            calUnlocked[pendingCalViewMode] = true;
            if (errorEl) errorEl.classList.add('hidden');
            modal.classList.add('hidden');
            const target = pendingCalViewMode;
            pendingCalViewMode = null;
            setCalendarViewMode(target);
        } else {
            if (errorEl) errorEl.classList.remove('hidden');
            if (modalContent) {
                modalContent.classList.remove('shake-anim');
                void modalContent.offsetWidth; // Force reflow
                modalContent.classList.add('shake-anim');
            }
            pinInput.value = '';
            pinInput.focus();
        }
    }

    // Keypad digits
    document.querySelectorAll('.cal-pin-key[data-digit]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!pinInput) return;
            if (pinInput.value.length < 4) {
                pinInput.value += btn.dataset.digit;
            }
            if (pinInput.value.length === 4) {
                checkCalPin();
            }
        });
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            if (!pinInput) return;
            pinInput.value = pinInput.value.slice(0, -1);
            if (errorEl) errorEl.classList.add('hidden');
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', function (e) {
            e.preventDefault();
            checkCalPin();
        });
    }

    if (confirmBtn) {
        confirmBtn.addEventListener('click', function (e) {
            e.preventDefault();
            checkCalPin();
        });
    }

    function closeCalLock() {
        modal.classList.add('hidden');
        pendingCalViewMode = null;
        if (pinInput) pinInput.value = '';
        if (errorEl) errorEl.classList.add('hidden');
    }

    if (cancelBtn) cancelBtn.addEventListener('click', closeCalLock);
    if (closeBtn) closeBtn.addEventListener('click', closeCalLock);

    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeCalLock();
    });

    if (pinInput) {
        pinInput.addEventListener('input', function () {
            this.value = this.value.replace(/[^0-9]/g, '');
            if (this.value.length === 4) {
                checkCalPin();
            }
        });
        pinInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                checkCalPin();
            }
        });
    }
}

function openCalLockModal(personKey) {
    pendingCalViewMode = personKey;
    const modal = document.getElementById('cal-lock-modal');
    const titleEl = document.getElementById('cal-lock-modal-title');
    const nameEl = document.getElementById('cal-lock-person-name');
    const instrEl = document.getElementById('cal-lock-instruction');
    const avatarEl = document.getElementById('cal-lock-avatar');
    const iconEl = document.getElementById('cal-lock-avatar-icon');
    const pinInput = document.getElementById('cal-lock-pin-input');
    const errorEl = document.getElementById('cal-lock-error');

    if (!modal) return;

    if (personKey === 'nik') {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-lock me-2 text-primary"></i>ยืนยันรหัสผ่านปฏิทินของนิก';
        if (nameEl) nameEl.textContent = 'ปฏิทินส่วนตัวของนิก';
        if (instrEl) instrEl.textContent = 'กรุณากรอกรหัสผ่าน 4 หลัก เพื่อเข้าถึงปฏิทินของนิก';
        if (avatarEl) avatarEl.className = 'cal-lock-avatar mb-3';
        if (iconEl) iconEl.className = 'fa-solid fa-user-check';
    } else if (personKey === 'som') {
        if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-lock me-2 text-warning"></i>ยืนยันรหัสผ่านปฏิทินของส้ม';
        if (nameEl) nameEl.textContent = 'ปฏิทินส่วนตัวของส้ม';
        if (instrEl) instrEl.textContent = 'กรุณากรอกรหัสผ่าน 4 หลัก เพื่อเข้าถึงปฏิทินของส้ม';
        if (avatarEl) avatarEl.className = 'cal-lock-avatar som-avatar mb-3';
        if (iconEl) iconEl.className = 'fa-solid fa-user-tag';
    }

    if (errorEl) errorEl.classList.add('hidden');
    if (pinInput) {
        pinInput.value = '';
        setTimeout(function () { pinInput.focus(); }, 150);
    }

    modal.classList.remove('hidden');
}

// Initialize Security PIN System when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
        initWebLock();
        initCalendarLock();
    });
} else {
    initWebLock();
    initCalendarLock();
}


