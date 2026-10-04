const API_BASE = "/api";

// ==========================================
// ১. সেশন গার্ড ও রিডাইরেক্ট লজিক (AUTH GUARDS)
// ==========================================

/**
 * সুরক্ষিত পেজের গার্ড (ড্যাশবোর্ড, টাস্ক, উইথড্র, ইত্যাদি)
 * লগইন না থাকলে সাথে সাথে /login পেজে পাঠিয়ে দেবে
 */
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

/**
 * গেস্ট পেজের গার্ড (Login বা Register পেজের জন্য)
 * ইউজার ইতিমধ্যে লগইন করা থাকলে সোজা /dashboard এ নিয়ে যাবে
 */
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
// ২. পেজ লোড ইভেন্ট ও রেফারেল হ্যান্ডলার
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;

    // লগইন বা রেজিস্টার পেজে থাকলে গেস্ট চেক রান করবে
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
// ৩. রেজিস্ট্রেশন প্রসেস
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
        if (typeof getDeviceFingerprint !== "function" || typeof getDeviceModel !== "function") {
            throw new Error("ডিভাইস ডিটেকশন লাইব্রেরি লোড হয়নি, পেজ রিফ্রেশ করুন!");
        }

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

        alert("অভিনন্দন! অ্যাকাউন্ট তৈরি সফল হয়েছে। অনুগ্রহ করে লগইন করুন।");
        window.location.replace("/login");

    } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ==========================================
// ৪. লগইন প্রসেস
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

        // সোজা ড্যাশবোর্ডে নিয়ে যাবে
        window.location.replace("/dashboard");

    } catch (err) {
        alert(err.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// ==========================================
// ৫. লগআউট প্রসেস
// ==========================================
function logout() {
    if (confirm("আপনি কি নিশ্চিত আপনার অ্যাকাউন্ট থেকে লগআউট করতে চান?")) {
        localStorage.removeItem("mex_user");
        window.location.replace("/login");
    }
}
