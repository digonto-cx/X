const API_BASE = "/api";

// ড্যাশবোর্ড ডেটা লোড
async function loadDashboard() {
    const user = checkUserAuth();
    if (!user) return;

    // ইউজারের ব্যালেন্স ও রেফার কোড দেখানো
    if (document.getElementById("user_balance")) {
        document.getElementById("user_balance").innerText = `${user.balance} ৳`;
    }
    if (document.getElementById("refer_link")) {
        document.getElementById("refer_link").value = `${window.location.origin}/register?ref=${user.referral_code}`;
    }

    // নোটিশ লোড
    try {
        const res = await fetch(`${API_BASE}/admin/dashboard`);
        const data = await res.json();
        if (document.getElementById("site_notice")) {
            document.getElementById("site_notice").innerText = data.site_notice;
        }
    } catch (e) {
        console.error("Notice load failed", e);
    }
}

// টাস্ক লিস্ট লোড করা (/tasks)
async function loadTasks() {
    const user = checkUserAuth();
    const taskContainer = document.getElementById("task_container");
    if (!taskContainer) return;

    try {
        const res = await fetch(`${API_BASE}/tasks?user_id=${user.id}`);
        const tasks = await res.json();

        if (tasks.length === 0) {
            taskContainer.innerHTML = `<p class="empty-msg"><i class="fa-solid fa-circle-exclamation"></i> বর্তমানে কোনো কাজ খালি নেই!</p>`;
            return;
        }

        taskContainer.innerHTML = tasks.map(task => `
            <div class="task-card">
                <h3><i class="fa-solid fa-list-check"></i> ${task.title}</h3>
                <p>${task.description || ""}</p>
                <div class="task-footer">
                    <span class="reward"><i class="fa-solid fa-coins"></i> ${task.amount} ৳</span>
                    <a href="/task/${task.id}" class="btn-action">কাজটি করুন</a>
                </div>
            </div>
        `).join("");
    } catch (err) {
        taskContainer.innerHTML = `<p class="error-msg">টাস্ক লোড হতে সমস্যা হয়েছে</p>`;
    }
}

// টাস্ক সাবমিশন হ্যান্ডলার (/task/id)
async function handleTaskSubmit(event) {
    event.preventDefault();
    const user = checkUserAuth();
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("id");
    const imageInput = document.getElementById("proof_image");

    if (!imageInput.files[0]) {
        alert("প্রুফ হিসেবে স্ক্রিনশট সিলেক্ট করুন!");
        return;
    }

    const formData = new FormData();
    formData.append("task_id", taskId);
    formData.append("user_id", user.id);
    formData.append("proof_image", imageInput.files[0]);

    const submitBtn = document.getElementById("submit_btn");
    submitBtn.innerText = "আপলোড হচ্ছে...";
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/task/submit`, {
            method: "POST",
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "সাবমিশন ব্যর্থ হয়েছে!");

        alert("টাস্ক সফলভাবে জমা দেওয়া হয়েছে! অ্যাডমিন চেক করে টাকা দিয়ে দেবে।");
        window.location.href = "/tasks";
    } catch (err) {
        alert(err.message);
        submitBtn.innerText = "পুনরায় জমা দিন";
        submitBtn.disabled = false;
    }
}

// Spin Wheel গেম
async function playSpin() {
    const user = checkUserAuth();
    const spinBtn = document.getElementById("spin_btn");
    spinBtn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/games/spin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "সমস্যা হয়েছে!");

        alert(`${data.message} আপনি পেয়েছেন ${data.reward} ৳!`);
        user.balance = data.balance;
        localStorage.setItem("mex_user", JSON.stringify(user));
        location.reload();
    } catch (err) {
        alert(err.message);
        spinBtn.disabled = false;
    }
}

// উইথড্র সাবমিশন (/withdraw)
async function handleWithdraw(event) {
    event.preventDefault();
    const user = checkUserAuth();
    const amount = parseFloat(document.getElementById("amount").value);
    const method = document.getElementById("method").value;
    const account_number = document.getElementById("account_number").value;

    try {
        const res = await fetch(`${API_BASE}/withdraw`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                amount,
                method,
                account_number
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "উইথড্র রিকোয়েস্ট ব্যর্থ!");

        alert("উইথড্র রিকোয়েস্ট সফল হয়েছে!");
        user.balance -= amount;
        localStorage.setItem("mex_user", JSON.stringify(user));
        window.location.href = "/";
    } catch (err) {
        alert(err.message);
    }
          }
