// নিশ্চিত করা হচ্ছে কল যেন সরাসরি ডোমেইনের /api রুটে যায়
const API_BASE = window.location.origin + "/api";

// ==========================================
// ১. সেশন ও রিডাইরেক্ট গার্ড (AUTH GUARDS)
// ==========================================

// ড্যাশবোর্ড, টাস্ক ইত্যাদির জন্য সিকিউরিটি চেক
function checkUserAuth() {
    const userStr = localStorage.getItem("mex_user");
    if (!userStr) {
        window.location.replace("/login");
        return null;
    }

    try {
        const user = JSON.parse(userStr);
        if (!user || !user.id) {
            localStorage.removeItem("mex_user");
            window.location.replace("/login");
            return null;
        }
        return user;
    } catch (e) {
        localStorage.removeItem("mex_user");
        window.location.replace("/login");
        return null;
    }
}

// লগইন করা থাকলে লগইন/রেজিস্টার পেজে ঢুকতে দেবে না
function checkGuestAuth() {
    const userStr = localStorage.getItem("mex_user");
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user && user.id) {
                window.location.replace("/dashboard");
            }
        } catch (e) {
            localStorage.removeItem("mex_user");
        }
    }
}

// ==========================================
// ২. পেজ লোড ও রেফার কোড হ্যান্ডলার
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // লগইন বা রেজিস্টার পেজে ঢুকলে চেক করবে ইতিমধ্যে লগইন আছে কিনা
    if (path.includes("login") || path.includes("register")) {
        checkGuestAuth();
    }

    // URL থেকে রেফার কোড নিয়ে ইনপুটে অটো বসানো (?ref=MEX123456)
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get("ref");
    const refInput = document.getElementById("referral_code");
    if (refParam && refInput) {
        refInput.value = refParam;
    }
});

// ==========================================
// ৩. রেজিস্ট্রেশন হ্যান্ডলার
// ==========================================
async function handleRegister(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> অ্যাকাউন্ট তৈরি হচ্ছে...`;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const refInput = document.getElementById("referral_code");
    const referral_code = refInput ? refInput.value.trim() : null;

    try {
        // fingerprint.js থেকে ইউনিক ডিভাইস ডাটা নেওয়া
        let device_id = "DEV_DEFAULT";
        let device_model = "Generic Mobile";

        if (typeof getDeviceFingerprint === "function") {
            device_id = await getDeviceFingerprint();
        }
        if (typeof getDeviceModel === "function") {
            device_model = getDeviceModel();
        }

        // ⚡ টার্গেট URL: /api/auth/register
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                email: email,
                password: password,
                device_id: device_id,
                device_model: device_model,
                referral_code: referral_code || null
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "রেজিস্ট্রেশন ব্যর্থ হয়েছে!");
        }

        alert("অভিনন্দন! রেজিস্ট্রেশন সফল হয়েছে। অনুগ্রহ করে লগইন করুন।");
        window.location.replace("/login");

    } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ==========================================
// ৪. লগইন হ্যান্ডলার
// ==========================================
async function handleLogin(event) {
    event.preventDefault();

    const submitBtn = event.target.querySelector("button[type='submit']");
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> লগইন হচ্ছে...`;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        // ⚡ টার্গেট URL: /api/auth/login
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ 
                email: email, 
                password: password 
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "লগইন ব্যর্থ হয়েছে!");
        }

        // ইউজারের সেশন ব্রাউজারে সেভ করা
        localStorage.setItem("mex_user", JSON.stringify(data.user));

        // ড্যাশবোর্ডে রিডাইরেক্ট
        window.location.replace("/dashboard");

    } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ==========================================
// ৫. লগআউট
// ==========================================
function logout() {
    if (confirm("আপনি কি নিশ্চিত আপনার একাউন্ট থেকে লগআউট করতে চান?")) {
        localStorage.removeItem("mex_user");
        window.location.replace("/login");
    }
}
