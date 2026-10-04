const API_BASE = "/api";

// URL থেকে রেফার কোড নিয়ে ইনপুটে বসানো (যেমন: site.com/register?ref=MEX123456)
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get("ref");
    const refInput = document.getElementById("referral_code");
    if (refParam && refInput) {
        refInput.value = refParam;
    }
});

// রেজিস্ট্রেশন ফর্ম সাবমিট
async function handleRegister(event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const referral_code = document.getElementById("referral_code") ? document.getElementById("referral_code").value : null;

    const device_id = await getDeviceFingerprint();
    const device_model = getDeviceModel();

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email,
                password,
                device_id,
                device_model,
                referral_code: referral_code || null
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "রেজিস্ট্রেশন ব্যর্থ হয়েছে!");

        alert("রেজিস্ট্রেশন সফল হয়েছে! দয়া করে লগইন করুন।");
        window.location.href = "/login";
    } catch (err) {
        alert(err.message);
    }
}

// লগইন ফর্ম সাবমিট
async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "লগইন ব্যর্থ হয়েছে!");

        localStorage.setItem("mex_user", JSON.stringify(data.user));
        alert("লগইন সফল হয়েছে!");
        window.location.href = "/";
    } catch (err) {
        alert(err.message);
    }
}

// ইউজার সেশন চেক
function checkUserAuth() {
    const user = JSON.parse(localStorage.getItem("mex_user"));
    if (!user) {
        window.location.href = "/login";
        return null;
    }
    return user;
}

// লগআউট
function logout() {
    localStorage.removeItem("mex_user");
    window.location.href = "/login";
}
