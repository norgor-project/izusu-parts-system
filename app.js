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
        document.getElementById('order-type').value = 'normal';
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

        // Show person view, hide search all view
        document.getElementById('view-search-all').classList.add('hidden');
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

    // Show search all view, hide person view
    document.getElementById('view-person').classList.add('hidden');
    document.getElementById('view-search-all').classList.remove('hidden');
    renderSearchAll();

    // Add animation to logo
    const logoBox = document.querySelector('.logo-box');
    logoBox.classList.remove('pulse');
    void logoBox.offsetWidth;
    logoBox.classList.add('pulse');
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
            (group.note ? ' <span class="ms-2">- ' + escapeHtml(group.note) + '</span>' : '') +
            '</div>' +
            '</div>' +
            '<div class="d-flex gap-2 align-items-center">' +
            '<span class="badge bg-secondary">' + group.items.length + ' รายการ (' + totalQty + ' ชิ้น)</span>' +
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
                '<td class="text-center">' + statusBadge + '</td>' +
                '<td class="text-center">' +
                '<button class="btn btn-outline-success btn-action me-1" data-receive="' + item.id + '" title="ทำเครื่องหมายว่ามาส่งแล้ว"><i class="fa-solid fa-check"></i></button>' +
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

document.querySelectorAll('.tab-btn[data-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
        if (tab.dataset.tab === 'search-all') {
            showSearchAll();
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

function updatePersonTabs() {
    document.querySelectorAll('.tab-btn[data-tab]').forEach(function (tab) {
        if (tab.dataset.tab === 'search-all') {
            tab.classList.toggle('active', currentPerson === 'search-all');
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
        });
    } else {
        console.log('DOM already ready, initializing app...');
        loadFromFirebase();
        openPerson('tey');
    }
}

initWhenReady();
initApp();

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
            '<td class="text-center">' +
            '<button class="btn btn-outline-danger btn-action" data-remove-temp="' + index + '"><i class="fa-solid fa-trash"></i></button>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

document.getElementById('btn-add-item').addEventListener('click', function () {
    const partNo = document.getElementById('temp-part-no-hidden').value.trim().toUpperCase();
    const partName = document.getElementById('temp-part-name').value.trim();
    const qty = Number(document.getElementById('temp-qty').value);
    
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
        qty: qty
    });
    
    document.getElementById('temp-part-no-hidden').value = '';
    document.getElementById('temp-part-no').value = '';
    document.getElementById('temp-part-name').value = '';
    document.getElementById('temp-qty').value = 1;
    
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
    if (removeBtn) {
        const index = parseInt(removeBtn.dataset.removeTemp);
        tempItems.splice(index, 1);
        renderTempItems();
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
        const note = document.getElementById('note').value.trim();
        
        if (editId) {
            // Edit mode - remove old item
            const idx = list.findIndex(function (x) { return x.id === editId; });
            if (idx !== -1) {
                list.splice(idx, 1);
            }
        }
        
        // Add all temp items
        const batchId = String(Date.now()) + Math.random().toString(36).substr(2, 9);
        const time = getCurrentTime();
        tempItems.forEach(function (item) {
            list.unshift({
                id: String(Date.now()) + Math.random().toString(36).substr(2, 9),
                batchId: batchId,
                date: todayTh(),
                time: time,
                partNo: item.partNo,
                partName: item.partName,
                qty: item.qty,
                type: orderType,
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
        document.getElementById('order-type').value = 'normal';
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

    if (deleteBatchBtn) {
        if (!confirm('ลบทั้งกลุ่มนี้หรือไม่?')) return;
        const batchId = deleteBatchBtn.dataset.deleteBatch;
        setOrders(getOrders().filter(function (x) { return x.batchId !== batchId; }));
        renderTable();
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

    if (editBtn) {
        const item = getOrders().find(function (x) { return x.id === editBtn.dataset.edit; });
        if (!item) return;
        document.getElementById('edit-id').value = item.id;
        document.getElementById('order-type').value = item.type;
        document.getElementById('note').value = item.note;

        // Add item to temp items
        tempItems = [{
            partNo: item.partNo,
            partName: item.partName,
            qty: item.qty
        }];

        document.getElementById('temp-part-no-hidden').value = item.partNo;
        document.getElementById('temp-part-no').value = item.partNo;

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
