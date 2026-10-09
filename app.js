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
    chang: { name: 'ช่าง' }
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
    chang: []
};

let currentPerson = 'tey';
let currentMenu = 'home';
let tempItems = [];
let depositItems = [];
let editingDepositId = null;
let deadlineAlerts = [];

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

        // Show person view, hide search all view, notes view and alerts view
        document.getElementById('view-search-all').classList.add('hidden');
        document.getElementById('view-notes').classList.add('hidden');
        document.getElementById('view-alerts').classList.add('hidden');
        document.getElementById('view-deposit').classList.add('hidden');
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

    // Show search all view, hide person view, notes view and alerts view
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-notes').classList.add('hidden');
    document.getElementById('view-alerts').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
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
        headerSub.textContent = 'โน๊ตทั่วไป';
        headerSub.classList.remove('fade');
    }, 150);

    updatePersonTabs();

    // Show notes view, hide person view, search all view and alerts view
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.add('hidden');
    document.getElementById('view-alerts').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
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

    // Show alerts view, hide person view, search all view and notes view
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.add('hidden');
    document.getElementById('view-notes').classList.add('hidden');
    document.getElementById('view-deposit').classList.add('hidden');
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

function loadNotes() {
    database.ref('notes').on('value', function (snapshot) {
        const notes = snapshot.val();
        const container = document.getElementById('notes-container');
        const empty = document.getElementById('notes-empty');
        container.innerHTML = '';
        container.appendChild(empty);

        if (!notes || Object.keys(notes).length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');

        Object.values(notes).forEach(function (note) {
            const card = document.createElement('div');
            card.className = 'card-custom p-4 mb-3';

            let alertInfo = '';
            if (note.alertDate && note.alertTime) {
                const isAlerted = note.alerted;
                const alertBadge = isAlerted
                    ? '<span class="badge rounded-pill" style="background:var(--success);color:white;"><i class="fa-solid fa-check me-1"></i>แจ้งเตือนแล้ว</span>'
                    : '<span class="badge rounded-pill" style="background:var(--warning);color:white;"><i class="fa-solid fa-bell me-1"></i>แจ้งเตือน ' + note.alertDate + ' ' + note.alertTime + '</span>';
                alertInfo = '<div class="mt-2">' + alertBadge + '</div>';
            }

            card.innerHTML =
                '<div class="d-flex justify-content-between align-items-start">' +
                '<div class="flex-grow-1">' +
                '<p class="mb-2" style="white-space: pre-wrap;">' + escapeHtml(note.text) + '</p>' +
                '<small class="text-muted">' + note.date + ' ' + note.time + '</small>' +
                alertInfo +
                '</div>' +
                '<div class="d-flex gap-2">' +
                '<button class="btn btn-sm btn-outline-secondary" data-edit-note="' + note.id + '">' +
                '<i class="fa-solid fa-pen"></i>' +
                '</button>' +
                '<button class="btn btn-sm btn-outline-danger" data-delete-note="' + note.id + '">' +
                '<i class="fa-solid fa-trash"></i>' +
                '</button>' +
                '</div>' +
                '</div>';
            container.appendChild(card);
        });
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
        // Create group box
        const groupBox = document.createElement('div');
        groupBox.className = 'card-custom p-4 mb-3';

        // Calculate total quantity in this group
        const totalQty = group.items.reduce(function (sum, item) {
            return sum + item.qty;
        }, 0);

        // Group header
        const header = document.createElement('div');
        header.className = 'mb-3 pb-3';
        header.style.borderBottom = '2px solid var(--border-color)';
        header.innerHTML =
            '<div class="d-flex justify-content-between align-items-center">' +
            '<div>' +
            '<h6 class="fw-bold mb-1">' +
            '<i class="fa-solid fa-calendar me-2" style="color:var(--primary);"></i>' +
            group.date + ' เวลา ' + group.time +
            '</h6>' +
            '<div class="text-muted small">' +
            '<span class="' + (group.type === 'urgent' ? 'order-type-urgent' : 'order-type-normal') + '">' +
            (group.type === 'urgent' ? 'สั่งด่วน' : 'สั่งปกติ') +
            '</span>' +
            (group.licensePlate ? ' <span class="ms-2"><i class="fa-solid fa-car me-1"></i>' + escapeHtml(group.licensePlate) + '</span>' : '') +
            (group.note ? ' <span class="ms-2">- ' + escapeHtml(group.note) + '</span>' : '') +
            '</div>' +
            '</div>' +
            '<div class="d-flex gap-2 align-items-center">' +
            '<span class="badge bg-secondary">' + group.items.length + ' รายการ (' + totalQty + ' ชิ้น)</span>' +
            '<button class="btn btn-outline-secondary btn-sm" data-edit-batch="' + group.items[0].batchId + '" title="แก้ไขหมายเหตุ">' +
            '<i class="fa-solid fa-pen"></i>' +
            '</button>' +
            '<button class="btn btn-outline-primary btn-sm" data-add-to-batch="' + group.items[0].batchId + '" title="เพิ่มรายการ">' +
            '<i class="fa-solid fa-plus"></i>' +
            '</button>' +
            '<button class="btn btn-outline-success btn-sm" data-print-batch="' + group.items[0].batchId + '" title="พิมพ์">' +
            '<i class="fa-solid fa-print"></i>' +
            '</button>' +
            '<button class="btn btn-outline-danger btn-sm" data-delete-batch="' + group.items[0].batchId + '" title="ลบทั้งกลุ่ม">' +
            '<i class="fa-solid fa-trash"></i>' +
            '</button>' +
            '</div>' +
            '</div>';
        groupBox.appendChild(header);

        // Items table
        const table = document.createElement('table');
        table.className = 'table table-sm align-middle mb-0';
        table.innerHTML =
            '<thead>' +
            '<tr class="custom-table-header">' +
            '<th class="py-2 ps-2" style="width: 50px;">#</th>' +
            '<th class="py-2">หมายเลขอะไหล่</th>' +
            '<th class="py-2">ชื่ออะไหล่</th>' +
            '<th class="py-2 text-center">จำนวน</th>' +
            '<th class="py-2">หมายเหตุอะไหล่</th>' +
            '<th class="py-2 text-center">สถานะ</th>' +
            '<th class="py-2 text-center">จัดการ</th>' +
            '</tr>' +
            '</thead>' +
            '<tbody></tbody>';
        const tbody = table.querySelector('tbody');

        // Add items in this batch
        group.items.forEach(function (item, index) {
            const tr = document.createElement('tr');
            const expectedDate = getExpectedDeliveryDate(item.date, item.type);
            const isReceived = item.received;
            const statusBadge = isReceived
                ? '<span class="badge rounded-pill" style="background:var(--success);color:white;"><i class="fa-solid fa-check me-1"></i>มาส่งแล้ว</span>'
                : '<span class="badge rounded-pill" style="background:var(--warning);color:white;"><i class="fa-solid fa-clock me-1"></i>รอของ (' + expectedDate + ')</span>';

            tr.innerHTML =
                '<td class="ps-2 fw-medium">' + (index + 1) + '</td>' +
                '<td class="fw-bold text-primary">' + escapeHtml(item.partNo) + '</td>' +
                '<td>' + escapeHtml(item.partName || '-') + '</td>' +
                '<td class="text-center fw-bold">' + item.qty + '</td>' +
                '<td class="text-muted small">' + escapeHtml(item.itemNote || '-') + '</td>' +
                '<td class="text-center">' + statusBadge + '</td>' +
                '<td class="text-center">' +
                '<button class="btn btn-outline-success btn-action me-1" data-receive="' + item.id + '" title="ทำเครื่องหมายว่ามาส่งแล้ว"><i class="fa-solid fa-check"></i></button>' +
                '<button class="btn btn-outline-secondary btn-action me-1" data-edit-item-note="' + item.id + '" title="แก้ไขหมายเหตุอะไหล่"><i class="fa-solid fa-note-sticky"></i></button>' +
                '<button class="btn btn-outline-secondary btn-action me-1" data-edit="' + item.id + '"><i class="fa-solid fa-pen"></i></button>' +
                '<button class="btn btn-outline-danger btn-action" data-del="' + item.id + '"><i class="fa-solid fa-trash"></i></button>' +
                '</td>';
            tbody.appendChild(tr);
        });

        groupBox.appendChild(table);
        container.appendChild(groupBox);
    });
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

    const totalQty = group.items.reduce(function (sum, item) {
        return sum + item.qty;
    }, 0);

    // Create print HTML
    let printHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
    printHTML += '<title>พิมพ์รายการสั่งอะไหล่</title>';
    printHTML += '<style>';
    printHTML += 'body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }';
    printHTML += '.header { text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 2px solid #000; }';
    printHTML += '.header h2 { margin: 0; font-size: 28px; }';
    printHTML += '.header p { margin: 8px 0; font-size: 16px; }';
    printHTML += 'table { width: 100%; border-collapse: collapse; margin-top: 25px; border: 2px solid #000; }';
    printHTML += 'th, td { border: 1px solid #000; padding: 12px 10px; text-align: left; }';
    printHTML += 'th { background: #f0f0f0; font-weight: bold; font-size: 16px; border-bottom: 2px solid #000; }';
    printHTML += 'td { font-size: 15px; }';
    printHTML += 'tr:nth-child(even) { background: #fafafa; }';
    printHTML += '.text-center { text-align: center; }';
    printHTML += '.footer { margin-top: 35px; padding-top: 15px; border-top: 1px solid #000; font-size: 14px; }';
    printHTML += '</style>';
    printHTML += '</head><body>';
    printHTML += '<div class="header">';
    printHTML += '<h2>รายการสั่งอะไหล่</h2>';
    printHTML += '<p><strong>ของ:</strong> ' + escapeHtml(PEOPLE[currentPerson].name) + '</p>';
    printHTML += '<p><strong>วันที่:</strong> ' + group.date + ' <strong>เวลา:</strong> ' + group.time + '</p>';
    if (group.type === 'urgent') {
        printHTML += '<p><strong>ประเภท:</strong> <span style="color: #ff0000; font-weight: bold;">สั่งด่วน</span></p>';
    } else {
        printHTML += '<p><strong>ประเภท:</strong> <span style="color: #008000; font-weight: bold;">สั่งปกติ</span></p>';
    }
    if (group.licensePlate) {
        printHTML += '<p><strong>ทะเบียน:</strong> ' + escapeHtml(group.licensePlate) + '</p>';
    }
    if (group.note) {
        printHTML += '<p><strong>หมายเหตุ:</strong> ' + escapeHtml(group.note) + '</p>';
    }
    printHTML += '</div>';
    printHTML += '<table>';
    printHTML += '<thead><tr>';
    printHTML += '<th style="width: 60px;">#</th>';
    printHTML += '<th style="width: 120px;">หมายเลขอะไหล่</th>';
    printHTML += '<th>ชื่ออะไหล่</th>';
    printHTML += '<th style="width: 80px;" class="text-center">จำนวน</th>';
    printHTML += '</tr></thead><tbody>';

    group.items.forEach(function (item, index) {
        printHTML += '<tr>';
        printHTML += '<td>' + (index + 1) + '</td>';
        printHTML += '<td>' + escapeHtml(item.partNo) + '</td>';
        printHTML += '<td>' + escapeHtml(item.partName || '-') + '</td>';
        printHTML += '<td class="text-center">' + item.qty + '</td>';
        printHTML += '</tr>';
    });

    printHTML += '</tbody></table>';
    printHTML += '<div class="footer">';
    printHTML += '<p><strong>สรุป:</strong> ' + group.items.length + ' รายการ (' + totalQty + ' ชิ้น)</p>';
    printHTML += '<p>พิมพ์เมื่อ: ' + todayTh() + ' ' + getCurrentTime() + '</p>';
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
        if (tab.dataset.tab === 'search-all') {
            showSearchAll();
        } else if (tab.dataset.tab === 'notes') {
            showNotes();
        } else if (tab.dataset.tab === 'alerts') {
            showAlerts();
        } else if (tab.dataset.tab === 'deposit') {
            showDeposit();
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
document.getElementById('btn-print-deposit-form').addEventListener('click', printDepositForm);
document.getElementById('btn-test-deadline-alert').addEventListener('click', testDeadlineAlertUI);
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
                        deposit.createdTime
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
        if (tab.dataset.tab === 'search-all') {
            tab.classList.toggle('active', currentPerson === 'search-all');
        } else if (tab.dataset.tab === 'notes') {
            tab.classList.toggle('active', currentPerson === 'notes');
        } else if (tab.dataset.tab === 'alerts') {
            tab.classList.toggle('active', currentPerson === 'alerts');
        } else if (tab.dataset.tab === 'deposit') {
            tab.classList.toggle('active', currentPerson === 'deposit');
        } else {
            tab.classList.toggle('active', tab.dataset.tab === currentPerson);
        }
    });
}

// Small PIN Input Logic (for temp items)
function initTempPinInput() {
    console.log('Initializing PIN input...');
    const pinBoxes = document.getElementById('temp-pin-boxes');
    const hiddenInput = document.getElementById('temp-part-no-hidden');
    const partNoInput = document.getElementById('temp-part-no');
    const clearBtn = document.getElementById('btn-clear-temp-pin');
    
    console.log('Elements found:', { pinBoxes: !!pinBoxes, hiddenInput: !!hiddenInput, partNoInput: !!partNoInput, clearBtn: !!clearBtn });
    
    if (!pinBoxes || !hiddenInput) {
        console.log('PIN elements not found, retrying...');
        setTimeout(initTempPinInput, 200);
        return;
    }
    
    // Clear existing boxes if any
    pinBoxes.innerHTML = '';
    
    // Create 10 PIN boxes
    for (let i = 0; i < 10; i++) {
        const box = document.createElement('div');
        box.className = 'pin-box-small';
        box.dataset.index = i;
        pinBoxes.appendChild(box);
    }
    
    const boxes = pinBoxes.querySelectorAll('.pin-box-small');
    console.log('Created', boxes.length, 'PIN boxes');
    
    function updateBoxes() {
        const value = hiddenInput.value.toUpperCase();
        boxes.forEach(function (box, index) {
            if (index < value.length) {
                box.textContent = value[index];
                box.classList.add('filled');
            } else {
                box.textContent = '';
                box.classList.remove('filled');
            }
        });
        
        // Update active state
        boxes.forEach(function (box) {
            box.classList.remove('active');
        });
        if (value.length < 10) {
            boxes[value.length].classList.add('active');
        }
        
        // Sync with actual input
        partNoInput.value = value;
    }
    
    hiddenInput.addEventListener('input', function () {
        // Allow any character, convert to uppercase
        this.value = this.value.toUpperCase();
        updateBoxes();
    });
    
    hiddenInput.addEventListener('focus', function () {
        updateBoxes();
    });
    
    hiddenInput.addEventListener('blur', function () {
        boxes.forEach(function (box) {
            box.classList.remove('active');
        });
    });
    
    // Click on boxes to focus hidden input
    pinBoxes.addEventListener('click', function () {
        hiddenInput.focus();
    });
    
    // Clear button
    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            hiddenInput.value = '';
            partNoInput.value = '';
            boxes.forEach(function (box) {
                box.textContent = '';
                box.classList.remove('filled', 'active');
            });
            boxes[0].classList.add('active');
            hiddenInput.focus();
        });
    }
    
    console.log('PIN input initialized successfully');
}

// Initialize PIN input after DOM is ready
function initWhenReady() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            console.log('DOM loaded, initializing PIN input...');
            setTimeout(initTempPinInput, 200);
        });
    } else {
        console.log('DOM already ready, initializing PIN input...');
        setTimeout(initTempPinInput, 200);
    }
}

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
                chang: []
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
    }, function(error) {
        console.error('Error loading from Firebase:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
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
        });
    } else {
        console.log('DOM already ready, initializing app...');
        loadFromFirebase();
        openPerson('tey');
        checkDeadlineAlerts();
    }
}

initWhenReady();
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
                    '<div>' +
                    '<small class="text-muted"><i class="fa-solid fa-calendar me-1"></i>สั่ง: ' + deposit.orderDate + '</small>' +
                    '<small class="text-muted ms-3"><i class="fa-solid fa-clock me-1"></i>รับ: ' + deposit.expectedDate + '</small>' +
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
        if (!notes) return;

        const now = new Date();
        const alertsToTrigger = [];

        Object.values(notes).forEach(function (note) {
            if (note.alertDate && note.alertTime && !note.alerted) {
                const alertDateTime = new Date(note.alertDate + 'T' + note.alertTime);
                if (now >= alertDateTime) {
                    alertsToTrigger.push(note);
                }
            }
        });

        if (alertsToTrigger.length > 0) {
            alertsToTrigger.forEach(function (note) {
                // Show alert
                alert('🔔 แจ้งเตือนโน๊ต:\n\n' + note.text);

                // Mark as alerted
                database.ref('notes/' + note.id).update({
                    alerted: true
                }).catch(function (error) {
                    console.error('Error updating note alert status:', error);
                });
            });
        }
    }).catch(function (error) {
        console.error('Error checking note alerts:', error);
    });
}

// Deposit Functions
function addDeposit() {
    const customer = document.getElementById('deposit-customer').value.trim();
    const phone = document.getElementById('deposit-phone').value.trim();
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
                    '<div>' +
                    '<small class="text-muted"><i class="fa-solid fa-calendar me-1"></i>สั่ง: ' + deposit.orderDate + '</small>' +
                    '<small class="text-muted ms-3"><i class="fa-solid fa-clock me-1"></i>รับ: ' + deposit.expectedDate + '</small>' +
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
    const orderDate = document.getElementById('deposit-order-date').value;
    const expectedDate = document.getElementById('deposit-expected-date').value;
    const amount = Number(document.getElementById('deposit-amount').value);

    if (!customer || !phone || !orderDate || !expectedDate) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วนก่อนพิมพ์');
        return;
    }

    printDepositHTML(customer, phone, orderDate, expectedDate, amount, '', depositItems, todayTh(), getCurrentTime());
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
            deposit.createdTime
        );
    }).catch(function (error) {
        console.error('Error loading deposit:', error);
        alert('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    });
}

function printDepositHTML(customer, phone, orderDate, expectedDate, amount, note, items, createdAt, createdTime) {
    // Convert dates to Thai format
    function formatDateToThai(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        const y = d.getFullYear() + 543;
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + y;
    }

    const orderDateTh = formatDateToThai(orderDate);
    const expectedDateTh = formatDateToThai(expectedDate);

    // Calculate totals
    let itemsTotal = 0;
    let itemsGrandTotal = 0;
    let itemsHtml = '';

    if (items && items.length > 0) {
        itemsHtml = '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">';
        itemsHtml += '<thead><tr style="background-color: #f2f2f2;">';
        itemsHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 8%;">ลำดับ</th>';
        itemsHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 25%;">เบอร์อะไหล่</th>';
        itemsHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: left; width: 25%;">ชื่ออะไหล่</th>';
        itemsHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 10%;">จำนวน</th>';
        itemsHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 14%;">ราคา/หน่วย</th>';
        itemsHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 18%;">ราคารวม</th>';
        itemsHtml += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center; width: 18%;">ราคาสุทธิ</th>';
        itemsHtml += '</tr></thead><tbody>';

        items.forEach(function (item, index) {
            const total = item.qty * item.price;
            const grandTotal = total * 1.07;
            itemsTotal += total;
            itemsGrandTotal += grandTotal;

            itemsHtml += '<tr>';
            itemsHtml += '<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">' + (index + 1) + '</td>';
            itemsHtml += '<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">' + escapeHtml(item.partNo) + '</td>';
            itemsHtml += '<td style="border: 1px solid #ddd; padding: 10px; text-align: left;">' + escapeHtml(item.partName || '-') + '</td>';
            itemsHtml += '<td style="border: 1px solid #ddd; padding: 10px; text-align: center;">' + item.qty + '</td>';
            itemsHtml += '<td style="border: 1px solid #ddd; padding: 10px; text-align: right;">' + item.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
            itemsHtml += '<td style="border: 1px solid #ddd; padding: 10px; text-align: right;">' + total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
            itemsHtml += '<td style="border: 1px solid #ddd; padding: 10px; text-align: right; font-weight: bold; color: #0275d8;">' + grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
            itemsHtml += '</tr>';
        });

        itemsHtml += '</tbody></table>';
    }

    const vatAmount = itemsTotal * 0.07;
    const remainingAmount = itemsGrandTotal - amount;

    // Create print HTML
    let printHTML = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
    printHTML += '<title>ใบรับมัดจำอะไหล่</title>';
    printHTML += '<style>';
    printHTML += '@page { margin: 8mm; size: A4; }';
    printHTML += 'body { font-family: "Tahoma", "Sarabun", sans-serif; background-color: #fff; margin: 0; padding: 0; color: #000; }';
    printHTML += '.invoice-box { max-width: 100%; margin: auto; background: #fff; padding: 10px; }';
    printHTML += '.header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }';
    printHTML += '.header h2 { margin: 0 0 5px 0; font-size: 22px; font-weight: bold; }';
    printHTML += '.header p { margin: 0; font-size: 14px; font-weight: bold; }';
    printHTML += '.info-box { border: 1px solid #000; background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; }';
    printHTML += '.info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }';
    printHTML += '.info-row:last-child { margin-bottom: 0; }';
    printHTML += '.highlight-red { color: #d9534f; font-weight: bold; }';
    printHTML += '.highlight-blue { color: #0275d8; font-weight: bold; }';
    printHTML += '.table-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; }';
    printHTML += 'table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 14px; }';
    printHTML += 'table, th, td { border: 1px solid #000; }';
    printHTML += 'th, td { padding: 10px; text-align: center; }';
    printHTML += 'th { background-color: #f2f2f2; font-weight: bold; }';
    printHTML += 'td.text-left { text-align: left; }';
    printHTML += 'td.text-right { text-align: right; }';
    printHTML += '.total-row td { font-weight: bold; }';
    printHTML += '.signature-section { display: flex; justify-content: space-between; margin-top: 50px; text-align: center; font-size: 14px; }';
    printHTML += '.signature-line { width: 280px; border-top: 1px solid #000; margin: auto; margin-bottom: 5px; }';
    printHTML += '</style>';
    printHTML += '</head><body>';

    printHTML += '<div class="invoice-box">';

    // Header
    printHTML += '<div class="header">';
    printHTML += '<h2>ใบรับมัดจำอะไหล่</h2>';
    printHTML += '<p>ศูนย์บริการอีซูซุฮั่วเชียงจั่น โทร.081-6395800</p>';
    printHTML += '</div>';

    // Info Box
    printHTML += '<div class="info-box">';
    printHTML += '<div class="info-row">';
    printHTML += '<div><strong>ชื่อลูกค้า:</strong> ' + escapeHtml(customer) + '</div>';
    printHTML += '<div><strong>เบอร์โทรติดต่อ:</strong> ' + escapeHtml(phone) + '</div>';
    printHTML += '</div>';
    printHTML += '<div class="info-row">';
    printHTML += '<div><strong>วันที่สั่งอะไหล่:</strong> ' + orderDateTh + '</div>';
    printHTML += '<div><strong>วันที่กำหนดรับของ:</strong> <span class="highlight-red">' + expectedDateTh + '</span></div>';
    printHTML += '</div>';
    printHTML += '<hr style="border: 0; border-top: 1px dashed #ccc; margin: 10px 0;">';
    if (itemsTotal > 0) {
        printHTML += '<div class="info-row">';
        printHTML += '<div><strong>ยอดรวมราคารวม:</strong> <span class="highlight-blue">' + itemsTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</span> | <strong>ราคาสุทธิ:</strong> <span class="highlight-blue">' + itemsGrandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</span></div>';
        printHTML += '<div><strong>ยอดมัดจำที่ชำระไว้:</strong> <span class="highlight-red">' + amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</span></div>';
        printHTML += '</div>';
    } else {
        printHTML += '<div class="info-row">';
        printHTML += '<div><strong>ยอดมัดจำที่ชำระไว้:</strong> <span class="highlight-red">' + amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' บาท</span></div>';
        printHTML += '</div>';
    }
    printHTML += '</div>';

    // Items Table
    if (itemsHtml) {
        printHTML += '<div class="table-title">รายการอะไหล่ที่สั่ง (' + items.length + ' รายการ):</div>';
        printHTML += itemsHtml;

        // Summary rows
        printHTML += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">';
        printHTML += '<tbody>';
        printHTML += '<tr class="total-row">';
        printHTML += '<td colspan="6" style="border: 1px solid #ddd; padding: 10px; text-align: right;">ผลรวมราคาสุทธิทั้งสิ้น</td>';
        printHTML += '<td style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #0275d8;">' + itemsGrandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
        printHTML += '</tr>';
        printHTML += '<tr class="total-row">';
        printHTML += '<td colspan="6" style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #d9534f;">หักยอดมัดจำรวม</td>';
        printHTML += '<td style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #d9534f;">' + amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
        printHTML += '</tr>';
        printHTML += '<tr class="total-row">';
        printHTML += '<td colspan="6" style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #006400;">ยอดคงเหลือที่ต้องชำระ</td>';
        printHTML += '<td style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #006400; font-size: 16px;">' + remainingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '</td>';
        printHTML += '</tr>';
        printHTML += '</tbody></table>';
    }

    // Signature Section
    printHTML += '<div class="signature-section">';
    printHTML += '<div>';
    printHTML += '<div class="signature-line"></div>';
    printHTML += '<div>ผู้รับเงิน / พนักงานออกใบมัดจำ</div>';
    printHTML += '</div>';
    printHTML += '<div>';
    printHTML += '<div class="signature-line"></div>';
    printHTML += '<div>ผู้สั่งซื้อ / ลูกค้า</div>';
    printHTML += '</div>';
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
        '<div class="col-md-3">' +
        '<label class="form-label small fw-bold mb-1">เบอร์ติดต่อ</label>' +
        '<input type="text" class="form-control form-control-sm" id="edit-phone" value="' + escapeHtml(deposit.phone) + '">' +
        '</div>' +
        '<div class="col-md-2">' +
        '<label class="form-label small fw-bold mb-1">วันที่สั่ง</label>' +
        '<input type="date" class="form-control form-control-sm" id="edit-order-date" value="' + deposit.orderDate + '">' +
        '</div>' +
        '<div class="col-md-2">' +
        '<label class="form-label small fw-bold mb-1">กำหนดรับของ</label>' +
        '<input type="date" class="form-control form-control-sm" id="edit-expected-date" value="' + deposit.expectedDate + '">' +
        '</div>' +
        '<div class="col-md-2">' +
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
    if (tempItems.length === 0) {
        alert('กรุณาเพิ่มรายการอะไหล่อย่างน้อย 1 รายการ');
        return;
    }
    
    const btn = this;
    btn.classList.add('loading');
    
    try {
        const list = getOrders();
        const editId = document.getElementById('edit-id').value;
        const orderType = document.getElementById('order-type').value;
        const licensePlate = document.getElementById('license-plate').value.trim();
        const note = document.getElementById('note').value.trim();

        let batchId, date, time;

        // Check if adding to existing batch
        if (editId && editId.startsWith('add-to-batch:')) {
            // Add to existing batch
            batchId = editId.replace('add-to-batch:', '');
            const existingBatch = list.find(function (x) { return x.batchId === batchId; });
            if (existingBatch) {
                date = existingBatch.date;
                time = existingBatch.time;
                licensePlate = existingBatch.licensePlate || licensePlate;
            } else {
                date = todayTh();
                time = getCurrentTime();
            }
        } else if (editId) {
            // Edit mode - remove old item
            const idx = list.findIndex(function (x) { return x.id === editId; });
            if (idx !== -1) {
                list.splice(idx, 1);
            }
            // Create new batch for edited item
            batchId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
            date = todayTh();
            time = getCurrentTime();
        } else {
            // Normal save - create new batch
            batchId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
            date = todayTh();
            time = getCurrentTime();
        }

        // Add all temp items
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

document.getElementById('order-list-container').addEventListener('click', function (e) {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    const receiveBtn = e.target.closest('[data-receive]');
    const deleteBatchBtn = e.target.closest('[data-delete-batch]');
    const editBatchBtn = e.target.closest('[data-edit-batch]');
    const addToBatchBtn = e.target.closest('[data-add-to-batch]');
    const printBatchBtn = e.target.closest('[data-print-batch]');
    const editItemNoteBtn = e.target.closest('[data-edit-item-note]');

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

        const currentNote = batchItems[0].note;
        const currentLicensePlate = batchItems[0].licensePlate || '';
        const newNote = prompt('แก้ไขหมายเหตุ:', currentNote);
        if (newNote === null) return; // User cancelled

        const newLicensePlate = prompt('แก้ไขทะเบียนรถ:', currentLicensePlate);
        if (newLicensePlate === null) return; // User cancelled

        batchItems.forEach(function (item) {
            item.note = newNote;
            item.licensePlate = newLicensePlate.trim();
        });
        setOrders(list);
        renderTable();
        return;
    }

    if (addToBatchBtn) {
        const batchId = addToBatchBtn.dataset.addToBatch;
        const list = getOrders();
        const batchItems = list.filter(function (x) { return x.batchId === batchId; });
        if (batchItems.length === 0) return;

        // Set edit-batch to indicate we're adding to existing batch
        document.getElementById('edit-id').value = 'add-to-batch:' + batchId;
        document.getElementById('order-type').value = batchItems[0].type;
        document.getElementById('license-plate').value = batchItems[0].licensePlate || '';
        document.getElementById('note').value = batchItems[0].note;
        document.getElementById('temp-item-note').value = '';
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
        showMenu('add');
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
        const item = getOrders().find(function (x) { return x.id === editBtn.dataset.edit; });
        if (!item) return;
        document.getElementById('edit-id').value = item.id;
        document.getElementById('order-type').value = item.type;
        document.getElementById('license-plate').value = item.licensePlate || '';
        document.getElementById('note').value = item.note;

        // Add item to temp items
        tempItems = [{
            partNo: item.partNo,
            partName: item.partName,
            qty: item.qty,
            itemNote: item.itemNote || ''
        }];

        document.getElementById('temp-part-no-hidden').value = item.partNo;
        document.getElementById('temp-part-no').value = item.partNo;
        document.getElementById('temp-item-note').value = item.itemNote || '';

        // Update PIN boxes
        const boxes = document.querySelectorAll('.pin-box-small');
        if (boxes.length > 0) {
            boxes.forEach(function (box, index) {
                box.classList.remove('active');
                if (index < item.partNo.length) {
                    box.textContent = item.partNo[index];
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

        renderTempItems();

        showMenu('add');
    }
    if (delBtn) {
        if (!confirm('ลบรายการนี้หรือไม่?')) return;
        setOrders(getOrders().filter(function (x) { return x.id !== delBtn.dataset.del; }));
        renderTable();
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
