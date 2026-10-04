const API_BASE = "/api";

// ==========================================
// ১. ইউজার ড্যাশবোর্ড লোড ও ব্যালেন্স সিঙ্ক
// ==========================================
async function loadDashboard() {
    const user = checkUserAuth();
    if (!user) return;

    // ব্যালেন্স ও রেফারাল লিঙ্ক প্রদর্শন
    const balanceElem = document.getElementById("user_balance");
    const referLinkElem = document.getElementById("refer_link");

    if (balanceElem) {
        balanceElem.innerText = `${parseFloat(user.balance).toFixed(2)} ৳`;
    }
    if (referLinkElem) {
        referLinkElem.value = `${window.location.origin}/register?ref=${user.referral_code}`;
    }

    // ব্যাকএন্ড থেকে সাইট নোটিশ লোড
    try {
        const res = await fetch(`${API_BASE}/admin/dashboard`);
        const data = await res.json();
        const noticeElem = document.getElementById("site_notice");
        if (noticeElem && data.site_notice) {
            noticeElem.innerText = data.site_notice;
        }
    } catch (e) {
        console.error("Notice load error", e);
    }
}

// ==========================================
// ২. টাস্ক লিস্ট লোড (/tasks)
// ==========================================
async function loadTasks() {
    const user = checkUserAuth();
    if (!user) return;

    const taskContainer = document.getElementById("task_container");
    if (!taskContainer) return;

    taskContainer.innerHTML = `<p class="text-gray-400 text-center text-xs py-10"><i class="fa-solid fa-spinner fa-spin text-rose-500"></i> টাস্ক লোড হচ্ছে...</p>`;

    try {
        const res = await fetch(`${API_BASE}/tasks?user_id=${user.id}`);
        const tasks = await res.json();

        if (!tasks || tasks.length === 0) {
            taskContainer.innerHTML = `
                <div class="bg-white/80 p-6 rounded-2xl text-center border border-rose-100 text-gray-500 text-xs">
                    <i class="fa-solid fa-circle-check text-2xl text-emerald-500 mb-2"></i>
                    <p>বর্তমানে কোনো নতুন টাস্ক নেই! কিছুক্ষণ পর আবার চেক করুন।</p>
                </div>
            `;
            return;
        }

        taskContainer.innerHTML = tasks.map(task => `
            <div class="bg-white/90 backdrop-blur-md border border-rose-100/80 p-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
                <div class="space-y-1">
                    <h3 class="font-bold text-xs text-gray-800 line-clamp-1">${task.title}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-rose-600 font-extrabold text-xs flex items-center gap-1">
                            <i class="fa-solid fa-coins text-[10px]"></i> ${parseFloat(task.amount).toFixed(2)} ৳
                        </span>
                    </div>
                </div>
                <a href="/task/${task.id}" class="bg-gradient-to-r from-rose-600 to-red-600 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition whitespace-nowrap">
                    কাজ করুন
                </a>
            </div>
        `).join("");

    } catch (err) {
        taskContainer.innerHTML = `<p class="text-rose-500 text-center text-xs py-4">টাস্ক লোড করতে ব্যর্থ হয়েছে!</p>`;
    }
}

// ==========================================
// ৩. টাস্ক ডিটেইলস ও প্রুফ সাবমিট (/task/id)
// ==========================================
async function loadTaskDetails() {
    const user = checkUserAuth();
    if (!user) return;

    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("id");

    if (!taskId) {
        window.location.replace("/tasks");
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/task/${taskId}`);
        if (!res.ok) throw new Error("টাস্ক পাওয়া যায়নি!");
        const task = await res.json();

        document.getElementById("task_title").innerText = task.title;
        document.getElementById("task_desc").innerText = task.description || "কোনো নির্দেশনা নেই";
        document.getElementById("task_reward").innerText = `${task.amount} ৳`;
        document.getElementById("task_link").href = task.link;
    } catch (e) {
        alert("টাস্ক লোড হতে সমস্যা হয়েছে!");
        window.location.replace("/tasks");
    }
}

async function handleTaskSubmit(event) {
    event.preventDefault();
    const user = checkUserAuth();
    if (!user) return;

    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get("id");
    const imageInput = document.getElementById("proof_image");

    if (!imageInput.files[0]) {
        alert("কাজের প্রমাণ হিসেবে স্ক্রিনশট সিলেক্ট করুন!");
        return;
    }

    const submitBtn = document.getElementById("submit_btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> প্রুফ আপলোড হচ্ছে...`;

    const formData = new FormData();
    formData.append("task_id", taskId);
    formData.append("user_id", user.id);
    formData.append("proof_image", imageInput.files[0]);

    try {
        const res = await fetch(`${API_BASE}/task/submit`, {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "সাবমিশন ব্যর্থ হয়েছে!");

        alert("টাস্ক সফলভাবে জমা দেওয়া হয়েছে! অ্যাডমিন যাচাই করার পর আপনার একাউন্টে টাকা যোগ হবে।");
        window.location.replace("/tasks");

    } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = "প্রুফ সাবমিট করুন";
    }
}

// ==========================================
// ৪. উইথড্রয়াল হ্যান্ডলার (/withdraw)
// ==========================================
async function handleWithdraw(event) {
    event.preventDefault();
    const user = checkUserAuth();
    if (!user) return;

    const amount = parseFloat(document.getElementById("amount").value);
    const method = document.getElementById("method").value;
    const account_number = document.getElementById("account_number").value.trim();

    const submitBtn = event.target.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> প্রসেসিং...`;

    try {
        const res = await fetch(`${API_BASE}/withdraw`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: user.id,
                amount: amount,
                method: method,
                account_number: account_number
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "উইথড্র রিকোয়েস্ট ব্যর্থ!");

        // ইউজারের লোকাল ব্যালেন্স আপডেট
        user.balance = user.balance - amount;
        localStorage.setItem("mex_user", JSON.stringify(user));

        alert("উইথড্র রিকোয়েস্ট সফলভাবে গ্রহণ করা হয়েছে!");
        window.location.replace("/");

    } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = "রিকোয়েস্ট পাঠান";
    }
}

// ==========================================
// ৫. গেমস (SPIN WHEEL & SCRATCH CARD)
// ==========================================
async function playSpin() {
    const user = checkUserAuth();
    if (!user) return;

    const spinBtn = document.getElementById("spin_btn");
    spinBtn.disabled = true;
    spinBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ঘুরছে...`;

    try {
        const res = await fetch(`${API_BASE}/games/spin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "স্পিন ব্যর্থ হয়েছে!");

        // লোকাল ব্যালেন্স আপডেট
        user.balance = data.balance;
        localStorage.setItem("mex_user", JSON.stringify(user));

        alert(`${data.message} আপনি জিতেছেন ${data.reward} ৳!`);
        location.reload();

    } catch (err) {
        alert(err.message);
        spinBtn.disabled = false;
        spinBtn.innerHTML = `<i class="fa-solid fa-play"></i> স্পিন করুন`;
    }
}

async function playScratch() {
    const user = checkUserAuth();
    if (!user) return;

    try {
        const res = await fetch(`${API_BASE}/games/scratch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.id })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "স্ক্র্যাচ ব্যর্থ হয়েছে!");

        // লোকাল ব্যালেন্স আপডেট
        user.balance = data.balance;
        localStorage.setItem("mex_user", JSON.stringify(user));

        alert(`${data.message} আপনি পেয়েছেন ${data.reward} ৳!`);
        location.reload();

    } catch (err) {
        alert(err.message);
    }
            }
