const API_BASE = "/api";

// ==========================================
// ১. সেশন গার্ড (AUTH GUARDS)
// ==========================================

// প্রোটেক্টেড পেজের জন্য চেক (যেমন: ড্যাশবোর্ড, টাস্ক, উইথড্র)
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

// গেস্ট পেজের গার্ড (লগইন করা থাকলে login বা register পেজে ঢুকতে দেবে না, সোজা ড্যাশবোর্ডে পাঠাবে)
function checkGuestAuth() {
    const userStr = localStorage.getItem("mex_user");
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (user && user.id) {
                window.location.replace("/");
            }
        } catch (e) {
            localStorage.removeItem("mex_user");
        }
    }
}

// ==========================================
// ২. রেফারেল কোড ডিটেক্টর
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // বর্তমান পেজ লগইন বা রেজিস্টার হলে চেক করবে
    const path = window.location.pathname;
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
        const device_id = await getDeviceFingerprint();
        const device_model = getDeviceModel();

        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.detail || "লগইন ব্যর্থ হয়েছে!");
        }

        // ব্রাউজারে ইউজার ডাটা সেভ রাখা
        localStorage.setItem("mex_user", JSON.stringify(data.user));
        window.location.replace("/");

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
    if (confirm("আপনি কি নিশ্চিত লগআউট করতে চান?")) {
        localStorage.removeItem("mex_user");
        window.location.replace("/login");
    }
        }
