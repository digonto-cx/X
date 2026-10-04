const API_BASE = "/api";

// অ্যাডমিন ড্যাশবোর্ড ডেটা লোড
async function loadAdminDashboard() {
    try {
        const res = await fetch(`${API_BASE}/admin/dashboard`);
        const data = await res.json();

        document.getElementById("total_users").innerText = data.total_users;
        document.getElementById("today_users").innerText = data.today_users;
        document.getElementById("yesterday_users").innerText = data.yesterday_users;
        document.getElementById("today_submissions").innerText = data.today_submissions;
        document.getElementById("current_notice").value = data.site_notice;
    } catch (e) {
        console.error("Admin dashboard load failed", e);
    }
}

// সাইট নোটিশ আপডেট
async function updateNotice() {
    const notice = document.getElementById("current_notice").value;
    try {
        const res = await fetch(`${API_BASE}/admin/notice?notice=${encodeURIComponent(notice)}`, {
            method: "POST"
        });
        if (res.ok) alert("নোটিশ সফলভাবে আপডেট হয়েছে!");
    } catch (e) {
        alert("নোটিশ আপডেট করা যায়নি");
    }
}

// ইউজার লিস্ট লোড (Pagination ২০টা ও সার্চ)
let currentPage = 1;
async function loadUsers(page = 1) {
    currentPage = page;
    const search = document.getElementById("user_search") ? document.getElementById("user_search").value : "";
    const tbody = document.getElementById("user_table_body");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/admin/users?page=${page}&search=${search}`);
        const result = await res.json();
        const users = result.data || [];

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.email}</td>
                <td>${u.balance} ৳</td>
                <td>${u.device_model}</td>
                <td>
                    <span class="badge ${u.is_banned ? 'badge-danger' : 'badge-success'}">
                        ${u.is_banned ? 'Banned' : 'Active'}
                    </span>
                </td>
                <td>
                    <button onclick="toggleBan('${u.id}', ${!u.is_banned})" class="btn-sm">
                        <i class="fa-solid ${u.is_banned ? 'fa-user-check' : 'fa-ban'}"></i>
                    </button>
                    <button onclick="adjustBalance('${u.id}')" class="btn-sm"><i class="fa-solid fa-plus"></i> ৳</button>
                    <button onclick="deleteUser('${u.id}')" class="btn-sm btn-danger"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `).join("");
    } catch (e) {
        console.error("Users load failed", e);
    }
}

// ব্যালেন্স অ্যাড
async function adjustBalance(userId) {
    const amount = prompt("কত টাকা যোগ বা বিয়োগ করতে চান? (যেমন: 50 অথবা -50):");
    if (!amount) return;

    await fetch(`${API_BASE}/admin/user/${userId}/balance?amount=${amount}`, { method: "POST" });
    loadUsers(currentPage);
}

// ব্যান / আনব্যান
async function toggleBan(userId, status) {
    await fetch(`${API_BASE}/admin/user/${userId}/ban?is_banned=${status}`, { method: "POST" });
    loadUsers(currentPage);
}

// ইউজার ডিলিট
async function deleteUser(userId) {
    if (confirm("আপনি কি নিশ্চিত এই ইউজারকে মুছে ফেলতে চান?")) {
        await fetch(`${API_BASE}/admin/user/${userId}`, { method: "DELETE" });
        loadUsers(currentPage);
    }
}

// বাল্ক টাস্ক প্রসেসিং (ম্যাক্সিমাম ৩০টি, র‍্যান্ডম ৩টি রিজেক্ট)
async function processBulkTasks() {
    const btn = document.getElementById("bulk_btn");
    btn.disabled = true;
    btn.innerText = "প্রসেস হচ্ছে...";

    try {
        const res = await fetch(`${API_BASE}/admin/submit/bulk`, { method: "POST" });
        const data = await res.json();
        alert(data.message);
        location.reload();
    } catch (e) {
        alert("বাল্ক অ্যাকশন ফেইল করেছে");
        btn.disabled = false;
    }
}

// উইথড্রয়াল লিস্ট লোড করা (আগের রিজেক্ট কাউন্ট সহ)
async function loadWithdrawals() {
    const tbody = document.getElementById("withdraw_table_body");
    if (!tbody) return;

    try {
        const res = await fetch(`${API_BASE}/admin/withdraw`);
        const list = await res.json();

        tbody.innerHTML = list.map(w => `
            <tr>
                <td>${w.users ? w.users.email : 'N/A'}</td>
                <td>${w.amount} ৳</td>
                <td>${w.method} (${w.account_number})</td>
                <td>
                    <span class="badge ${w.user_total_rejections > 0 ? 'badge-warning' : 'badge-info'}">
                        ${w.user_total_rejections} বার
                    </span>
                </td>
                <td><span class="badge">${w.status}</span></td>
            </tr>
        `).join("");
    } catch (e) {
        console.error("Withdraw list failed", e);
    }
}

// ImgBB API Manager (কী লিস্ট, অ্যাড, ডিলিট)
async function loadImgbbKeys() {
    const listContainer = document.getElementById("imgbb_key_list");
    if (!listContainer) return;

    try {
        const res = await fetch(`${API_BASE}/admin/imgbb`);
        const keys = await res.json();

        listContainer.innerHTML = keys.map(k => `
            <div class="key-item">
                <span><code>${k.api_key}</code> (ফেইল্ড: ${k.failed_count})</span>
                <button onclick="deleteImgbbKey('${k.id}')" class="btn-sm btn-danger">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join("");
    } catch (e) {
        console.error(e);
    }
}

async function addImgbbKey() {
    const key = document.getElementById("new_api_key").value;
    if (!key) return;

    await fetch(`${API_BASE}/admin/imgbb?api_key=${key}`, { method: "POST" });
    document.getElementById("new_api_key").value = "";
    loadImgbbKeys();
}

async function deleteImgbbKey(id) {
    if (confirm("কী ডিলিট করতে চান?")) {
        await fetch(`${API_BASE}/admin/imgbb/${id}`, { method: "DELETE" });
        loadImgbbKeys();
    }
    }
