import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "./firebase_config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let allTransactions = [];
let paymentMappings = {};

// --- Load Mappings ---
async function loadMappings() {
    const snap = await getDocs(collection(db, "payment_mappings"));
    snap.forEach(doc => {
        paymentMappings[doc.data().amount] = doc.data().label;
    });
}

// --- Sidebar/Dropdown Logic ---
function setupUI() {
    const collapseBtn = document.getElementById('sidebarCollapse');
    if (collapseBtn) {
        collapseBtn.onclick = () => {
            document.body.classList.toggle('sidebar-collapsed');
            const icon = collapseBtn.querySelector('i');
            icon.setAttribute('data-lucide', document.body.classList.contains('sidebar-collapsed') ? 'chevron-right' : 'chevron-left');
            lucide.createIcons();
        };
    }

    const dropdownTrigger = document.getElementById('adminDropdownTrigger');
    const dropdown = document.getElementById('adminDropdown');
    if (dropdownTrigger) {
        dropdownTrigger.onclick = (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        };
    }
    document.onclick = () => dropdown?.classList.add('hidden');

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
            await signOut(auth);
            window.location.href = 'login.html';
        };
    }
}

// --- Report Generation ---
async function generateReport() {
    const monthVal = document.getElementById('monthPicker').value;
    if (!monthVal) {
        alert("Please select a month first");
        return;
    }

    const snap = await getDocs(query(collection(db, "transactions"), orderBy("creationTime", "desc")));
    allTransactions = snap.docs.map(doc => doc.data());

    const filtered = allTransactions.filter(tx => tx.creationTime.startsWith(monthVal));

    renderStats(filtered);
    renderTable(filtered);
}

function renderStats(data) {
    const stats = data.reduce((acc, tx) => {
        if (tx.status === 'approved') acc.approved += tx.amount;
        else if (tx.status === 'pending') acc.pending += tx.amount;
        else if (tx.status === 'refunded') acc.refunded += tx.amount;
        
        const note = paymentMappings[tx.amount] || "Others";
        acc.categories[note] = (acc.categories[note] || 0) + tx.amount;
        return acc;
    }, { approved: 0, pending: 0, refunded: 0, categories: {} });

    document.getElementById('sumApproved').innerText = `₹${stats.approved.toLocaleString()}`;
    document.getElementById('sumPending').innerText = `₹${stats.pending.toLocaleString()}`;
    document.getElementById('sumRefunded').innerText = `₹${stats.refunded.toLocaleString()}`;

    const categoriesArray = Object.entries(stats.categories);
    categoriesArray.sort((a, b) => {
        if (a[0] === "Others") return 1;
        if (b[0] === "Others") return -1;
        return 0;
    });

    const methodBox = document.getElementById('methodBreakdown');
    methodBox.innerHTML = categoriesArray.map(([name, val]) => `
        <div class="method-row">
            <span class="method-name">${name}</span>
            <span class="method-value">₹${val.toLocaleString()}</span>
        </div>
    `).join('') || '<p style="color: var(--text-muted); font-size: 14px;">No category data.</p>';
}


window.copyTxId = (id) => {
    navigator.clipboard.writeText(id).then(() => {
        // Simple alert for reports or we can inject a toast helper
        alert("Transaction ID copied!");
    });
};

function renderTable(data) {
    const body = document.getElementById('reportTableBody');
    body.innerHTML = data.map(tx => {
        const rule = paymentMappings[tx.amount] || "Others";
        const dateStr = new Date(tx.creationTime).toLocaleString('en-GB', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });

        return `
            <tr>
                <td>${tx.payer}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <code>${tx.transactionId}</code>
                        <button onclick="copyTxId('${tx.transactionId}')" class="icon-btn-small print-hide" title="Copy ID" style="padding: 2px;">
                            <i data-lucide="copy" style="width: 12px; height: 12px;"></i>
                        </button>
                    </div>
                </td>
                <td>${tx.paidVia || 'N/A'}</td>
                <td>${rule}</td>
                <td style="font-weight: 600;">₹${tx.amount.toLocaleString()}</td>
                <td>${dateStr}</td>
                <td><span class="status-badge ${tx.status}">${tx.status}</span></td>
            </tr>
        `;
    }).join('');
    lucide.createIcons();
}



function handleExport() {
    // We use the browser's native print engine for 100% reliability.
    // Our @media print styles in style.css will handle the formatting.
    window.print();
}



// Initialize
loadMappings();
setupUI();
document.getElementById('generateBtn').onclick = generateReport;
document.getElementById('exportReportBtn').onclick = handleExport;
