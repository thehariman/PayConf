import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, updateDoc, query, orderBy, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "./firebase_config.js";

// Initialize Firebase
let db;
let auth;
let transactions = [];
let filteredTransactions = [];
let paymentMappings = {};

if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    listenToTransactions();
    listenToMappings();
} else {
    console.warn("⚠️ Firebase not configured. Please add your config to app.js");
}

// --- DOM Elements ---
const tableBody = document.getElementById('tableBody');
const totalAmountEl = document.getElementById('totalAmount');
const approvedAmountEl = document.getElementById('approvedAmount');
const pendingAmountEl = document.getElementById('pendingAmount');
const refundedAmountEl = document.getElementById('refundedAmount');
const approvedCountEl = document.getElementById('approvedCount');
const pendingCountEl = document.getElementById('pendingCount');
const refundedCountEl = document.getElementById('refundedCount');
const globalSearch = document.getElementById('globalSearch');
const statusFilter = document.getElementById('statusFilter');
const typeFilter = document.getElementById('typeFilter');
const dateFilter = document.getElementById('dateFilter');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const excelInput = document.getElementById('excelInput');
const uploadTrigger = document.getElementById('uploadTrigger');
const navUnverified = document.getElementById('navUnverified');
const navApproved = document.getElementById('navApproved');
const navRefunded = document.getElementById('navRefunded');
const navDashboard = document.getElementById('navDashboard');

// --- Custom Modal Helper ---
function openModal({ title, message, showInput = false, confirmText = "Confirm", isDanger = false }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('customModal');
        const titleEl = document.getElementById('modalTitle');
        const messageEl = document.getElementById('modalMessage');
        const inputContainer = document.getElementById('modalInputContainer');
        const inputEl = document.getElementById('modalInput');
        const confirmBtn = document.getElementById('modalConfirm');
        const cancelBtn = document.getElementById('modalCancel');
        const iconEl = document.getElementById('modalIcon');

        titleEl.innerText = title;
        messageEl.innerText = message;
        confirmBtn.innerText = confirmText;
        inputEl.value = "";
        
        if (showInput) inputContainer.classList.remove('hidden');
        else inputContainer.classList.add('hidden');

        if (isDanger) {
            iconEl.style.background = "#fef2f2";
            iconEl.style.color = "#ef4444";
            confirmBtn.style.background = "#ef4444";
        } else {
            iconEl.style.background = "#eff6ff";
            iconEl.style.color = "#2563eb";
            confirmBtn.style.background = "#2563eb";
        }

        modal.classList.remove('hidden');

        const cleanup = (value) => {
            modal.classList.add('hidden');
            confirmBtn.removeEventListener('click', onConfirm);
            cancelBtn.removeEventListener('click', onCancel);
            resolve(value);
        };

        const onConfirm = () => cleanup(showInput ? inputEl.value : true);
        const onCancel = () => cleanup(false);

        confirmBtn.addEventListener('click', onConfirm);
        cancelBtn.addEventListener('click', onCancel);
    });
}

// --- Helper Functions ---
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function updateLiveDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        dateEl.innerText = new Date().toLocaleDateString('en-US', options);
    }
}

// --- Functions ---
window.approveTransaction = async (id) => {
    try {
        await updateDoc(doc(db, "transactions", id), { status: 'approved' });
        showToast("Payment approved successfully", "success");
    } catch (e) {
        showToast("Approval failed", "error");
    }
};

window.revokeTransaction = async (id) => {
    const confirmed = await openModal({
        title: "Revoke Approval",
        message: "This will move the payment back to the Pending list. Proceed?",
        confirmText: "Yes, Revoke"
    });
    if (!confirmed) return;
    await updateDoc(doc(db, "transactions", id), { status: 'pending' });
};

window.refundTransaction = async (id) => {
    const confirmed = await openModal({
        title: "Confirm Refund",
        message: "Are you sure you want to mark this transaction as REFUNDED?",
        confirmText: "Mark as Refunded",
        isDanger: true
    });
    if (!confirmed) return;
    await updateDoc(doc(db, "transactions", id), { status: 'refunded' });
};

window.deleteTransaction = async (id) => {
    const confirmed = await openModal({
        title: "Delete Transaction",
        message: "⚠️ Warning: This will permanently remove the record from the Cloud.",
        confirmText: "Delete Permanently",
        isDanger: true
    });
    if (!confirmed) return;
    try {
        await deleteDoc(doc(db, "transactions", id));
        showToast("Transaction deleted", "success");
    } catch (e) {
        showToast("Delete failed", "error");
    }
};

async function vanishAllData() {
    const step1 = await openModal({
        title: "Critical Warning",
        message: "You are about to DELETE ALL TRANSACTIONS. This cannot be undone!",
        confirmText: "I Understand",
        isDanger: true
    });
    if (!step1) return;

    const step2 = await openModal({
        title: "Final Confirmation",
        message: "Please type 'VANISH' in the box below to wipe the entire database:",
        showInput: true,
        confirmText: "Vanish Everything",
        isDanger: true
    });

    if (step2 !== 'VANISH') {
        showToast("Deletion cancelled. Verification failed.", "warning");
        return;
    }

    try {
        const snapshot = await getDocs(collection(db, "transactions"));
        const total = snapshot.size;
        for (const docSnap of snapshot.docs) {
            await deleteDoc(doc(db, "transactions", docSnap.id));
        }
        showToast(`Successfully vanished ${total} records.`, "success");
    } catch (e) {
        showToast("Vanish failed.", "error");
    }
}

async function handleLogout() {
    const confirmed = await openModal({
        title: "Logout",
        message: "Are you sure you want to logout?",
        confirmText: "Logout"
    });
    if (!confirmed) return;
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (e) {
        showToast("Logout failed", "error");
    }
}

function setupListeners() {
    uploadTrigger.addEventListener('click', () => excelInput.click());
    excelInput.addEventListener('change', handleExcelUpload);
    globalSearch.addEventListener('input', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    const noteFilter = document.getElementById('noteFilter');
    if (noteFilter) noteFilter.addEventListener('change', applyFilters);
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) monthFilter.addEventListener('change', applyFilters);
    typeFilter.addEventListener('change', applyFilters);





    const dropdownTrigger = document.getElementById('adminDropdownTrigger');
    const dropdown = document.getElementById('adminDropdown');
    if (dropdownTrigger) {
        dropdownTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', () => {
        if (dropdown) dropdown.classList.add('hidden');
    });

    const vanishBtn = document.getElementById('vanishBtn');
    if (vanishBtn) vanishBtn.addEventListener('click', vanishAllData);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    navDashboard.addEventListener('click', (e) => { e.preventDefault(); statusFilter.value = 'all'; setActiveNav(navDashboard); applyFilters(); });
    navUnverified.addEventListener('click', (e) => { e.preventDefault(); statusFilter.value = 'pending'; setActiveNav(navUnverified); applyFilters(); });
    navApproved.addEventListener('click', (e) => { e.preventDefault(); statusFilter.value = 'approved'; setActiveNav(navApproved); applyFilters(); });
    navRefunded.addEventListener('click', (e) => { e.preventDefault(); statusFilter.value = 'refunded'; setActiveNav(navRefunded); applyFilters(); });

    // --- Sidebar Collapse ---
    const collapseBtn = document.getElementById('sidebarCollapse');
    if (collapseBtn) {
        collapseBtn.onclick = (e) => {
            e.preventDefault();
            document.body.classList.toggle('sidebar-collapsed');
            const icon = collapseBtn.querySelector('i');
            if (document.body.classList.contains('sidebar-collapsed')) {
                icon.setAttribute('data-lucide', 'chevron-right');
            } else {
                icon.setAttribute('data-lucide', 'chevron-left');
            }
            lucide.createIcons();
        };
    }



    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }

    if (menuToggle) {


        menuToggle.addEventListener('click', () => { sidebar.classList.toggle('active'); sidebarOverlay.classList.toggle('active'); });
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => { sidebar.classList.remove('active'); sidebarOverlay.classList.remove('active'); });
    }

    // --- PWA Installation Logic ---
    let deferredPrompt;
    const installBtn = document.getElementById('installApp');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installBtn) installBtn.classList.remove('hidden');
    });

    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installBtn.classList.add('hidden');
            }
            deferredPrompt = null;
        });
    }

    window.addEventListener('appinstalled', () => {
        if (installBtn) installBtn.classList.add('hidden');
        deferredPrompt = null;
     // Stat Cards
    document.querySelector('.stat-card.approved').addEventListener('click', () => { statusFilter.value = 'approved'; applyFilters(); });
    document.querySelector('.stat-card.pending').addEventListener('click', () => { statusFilter.value = 'pending'; applyFilters(); });
    document.querySelector('.stat-card.refunded').addEventListener('click', () => { statusFilter.value = 'refunded'; applyFilters(); });
}

function setActiveNav(el) {
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    if (el) el.classList.add('active');
}

function listenToTransactions() {
    const q = query(collection(db, "transactions"), orderBy("creationTime", "desc"));
    onSnapshot(q, (snapshot) => {
        transactions = snapshot.docs.map(doc => doc.data());
        applyFilters();
    });
}

function listenToMappings() {
    onSnapshot(collection(db, "payment_mappings"), (snapshot) => {
        paymentMappings = {};
        const noteFilter = document.getElementById('noteFilter');
        const uniqueLabels = new Set();
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            paymentMappings[data.amount] = data.label;
            uniqueLabels.add(data.label);
        });
        if (noteFilter) {
            noteFilter.innerHTML = ""; 
            const allOpt = document.createElement('option');
            allOpt.value = "all";
            allOpt.innerText = "Filter by Rule (All)";
            noteFilter.appendChild(allOpt);
            uniqueLabels.forEach(label => {
                const opt = document.createElement('option');
                opt.value = label;
                opt.innerText = label;
                noteFilter.appendChild(opt);
            });
            const othersOpt = document.createElement('option');
            othersOpt.value = "Others";
            othersOpt.innerText = "Others";
            noteFilter.appendChild(othersOpt);
        }
        applyFilters();
    });
}

async function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file || !db) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
        const dataBuffer = evt.target.result;
        const wb = XLSX.read(dataBuffer, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(ws);
        let newCount = 0;
        let skipCount = 0;
        for (const item of rawData) {
            const txId = String(item['Transaction ID'] || item['transactionId'] || '').trim();
            if (!txId) continue;
            const isDuplicate = transactions.some(t => t.transactionId === txId);
            if (isDuplicate) {
                skipCount++;
                continue;
            }
            let rawTime = item['Creation time'] || item['Date'] || item['time'] || item['Creation Time'];
            let finalDate = null;
            if (rawTime) {
                let cleanTime = String(rawTime).replace(/[^\x00-\x7F]/g, " ").replace(/\s+/g, " ").trim();
                const monthMap = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
                const match = cleanTime.match(/([A-Za-z]+)\s+(\d+),?\s+(\d{4}),?\s*(\d+):(\d+)\s*(AM|PM)?/i);
                if (match) {
                    const month = monthMap[match[1].toLowerCase().substring(0, 3)];
                    const day = parseInt(match[2]);
                    const year = parseInt(match[3]);
                    let hours = parseInt(match[4]);
                    const mins = parseInt(match[5]);
                    const ampm = (match[6] || "").toUpperCase();
                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                    const d = new Date(year, month, day, hours, mins);
                    if (!isNaN(d.getTime())) finalDate = d;
                } else {
                    let d = new Date(cleanTime);
                    if (!isNaN(d.getTime())) finalDate = d;
                }
            }
            if (!finalDate) {
                skipCount++;
                continue;
            }
            const txData = {
                transactionId: txId,
                payer: String(item['Payer'] || 'N/A').trim(),
                paidVia: String(item['Paid via'] || 'N/A').trim(),
                type: String(item['Type (UPI / UPI CC)'] || item['Type'] || 'UPI').trim(),
                creationTime: finalDate.toISOString(),
                amount: parseFloat(String(item['Amount'] || 0).replace(/[^0-9.]/g, '')),
                status: 'pending'
            };
            await setDoc(doc(db, "transactions", txId), txData);
            newCount++;
        }
        if (newCount > 0) showToast(`Upload complete! ${newCount} new added.`, "success");
        else if (skipCount > 0) showToast(`Skipped ${skipCount} duplicates.`, "warning");
    };
    reader.readAsArrayBuffer(file);
}

function applyFilters() {
    const searchTerm = globalSearch.value.toLowerCase();
    const statusVal = statusFilter.value;
    const typeVal = typeFilter.value;
    const noteFilter = document.getElementById('noteFilter');
    const noteVal = noteFilter ? noteFilter.value : 'all';
    filteredTransactions = transactions.filter(tx => {
        const matchesSearch = tx.payer.toLowerCase().includes(searchTerm) || tx.transactionId.toLowerCase().includes(searchTerm);
        let matchesStatus;
        if (searchTerm.length > 0) {
            matchesStatus = statusVal === 'all' || tx.status === statusVal;
        } else {
            matchesStatus = statusVal === 'all' ? tx.status === 'pending' : tx.status === statusVal;
        }
        const txNote = paymentMappings[tx.amount] || "Others";
        const matchesNote = noteVal === 'all' || txNote === noteVal;
        const matchesType = typeVal === 'all' || tx.type === typeVal;
        return matchesSearch && matchesStatus && matchesNote && matchesType;
    });
    renderTable();
    updateStats();
    updateLiveDate();
}

window.copyTxId = (id) => {
    navigator.clipboard.writeText(id).then(() => {
        showToast("Transaction ID copied!", "success");
    });
};

function renderTable() {
    tableBody.innerHTML = filteredTransactions.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding: 40px; color: #94a3b8;">No transactions found.</td></tr>' : 
    filteredTransactions.map(tx => {
        const note = paymentMappings[tx.amount] || "Others";
        return `
            <tr>
                <td class="payer-cell">${tx.payer}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <code>${tx.transactionId}</code>
                        <button onclick="copyTxId('${tx.transactionId}')" class="icon-btn-small" title="Copy ID">
                            <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
                        </button>
                    </div>
                </td>
                <td>${tx.paidVia}</td>
                <td style="font-size: 12px; color: var(--text-muted); font-weight: 500;">
                    ${new Date(tx.creationTime).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td><span class="note-badge">${note}</span></td>
                <td style="font-weight: 700;">₹${tx.amount.toLocaleString()}</td>
                <td><span class="status-badge ${tx.status}">${tx.status}</span></td>
                <td>
                    <div class="action-btns">
                        ${tx.status === 'pending' ? `
                            <button onclick="approveTransaction('${tx.transactionId}')" class="btn btn-primary btn-sm">Approve</button>
                        ` : tx.status === 'approved' ? `
                            <div style="display: flex; gap: 5px;">
                                <button onclick="refundTransaction('${tx.transactionId}')" class="btn btn-secondary btn-sm" style="color: var(--warning); border-color: var(--warning);">Refund</button>
                                <button onclick="revokeTransaction('${tx.transactionId}')" class="btn btn-secondary btn-sm" style="color: var(--primary); border-color: var(--primary);">Revoke</button>
                                <button onclick="deleteTransaction('${tx.transactionId}')" class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: var(--danger);"><i data-lucide="trash-2"></i></button>
                            </div>
                        ` : '<span style="font-size: 12px; color: #94a3b8;">No actions</span>'}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}

function updateStats() {
    const stats = transactions.reduce((acc, tx) => {
        acc.total += tx.amount;
        if (tx.status === 'approved') { acc.approved += tx.amount; acc.approvedCount++; }
        else if (tx.status === 'pending') { acc.pending += tx.amount; acc.pendingCount++; }
        else if (tx.status === 'refunded') { acc.refunded += tx.amount; acc.refundedCount++; }
        return acc;
    }, { total: 0, approved: 0, pending: 0, refunded: 0, approvedCount: 0, pendingCount: 0, refundedCount: 0 });

    totalAmountEl.innerText = `₹${stats.total.toLocaleString()}`;
    approvedAmountEl.innerText = `₹${stats.approved.toLocaleString()}`;
    pendingAmountEl.innerText = `₹${stats.pending.toLocaleString()}`;
    refundedAmountEl.innerText = `₹${stats.refunded.toLocaleString()}`;
    approvedCountEl.innerText = stats.approvedCount;
    pendingCountEl.innerText = stats.pendingCount;
    refundedCountEl.innerText = stats.refundedCount;
}

function handleExport() {
    if (filteredTransactions.length === 0) {
        showToast("No data to export", "warning");
        return;
    }
    const exportData = filteredTransactions.map(tx => ({
        'Payer Name': tx.payer,
        'Transaction ID': tx.transactionId,
        'Payment Method': tx.paidVia,
        'Type': tx.type,
        'Amount': tx.amount,
        'Status': tx.status,
        'Date': new Date(tx.creationTime).toLocaleString(),
        'Category': paymentMappings[tx.amount] || 'Others'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const fileName = `Payments_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast("Excel report generated!", "success");
}

setupListeners();
updateLiveDate();

