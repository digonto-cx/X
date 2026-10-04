// ইউনিক ডিভাইস ফিঙ্গারপ্রিন্ট আইডি জেনারেট করা
async function getDeviceFingerprint() {
    let storedId = localStorage.getItem("mex_device_id");
    if (storedId) return storedId;

    const screenRes = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const userAgent = navigator.userAgent;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    // Canvas Fingerprinting
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = "top";
    ctx.font = "14px 'Arial'";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#f60";
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = "#069";
    ctx.fillText("MicroEarnX-Fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("MicroEarnX-Fingerprint", 4, 17);
    const canvasData = canvas.toDataURL();

    // Raw String থেকে হ্যাশ কোড তৈরি
    const rawString = `${screenRes}_${userAgent}_${timeZone}_${hardwareConcurrency}_${canvasData}`;
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
        hash = ((hash << 5) - hash) + rawString.charCodeAt(i);
        hash |= 0;
    }

    const deviceId = "DEV_" + Math.abs(hash).toString(16).toUpperCase();
    localStorage.setItem("mex_device_id", deviceId);
    return deviceId;
}

// ডিভাইস মডেল ডিটেক্ট করা (যেমন: Samsung SM-A525F, iPhone, Windows ইত্যাদি)
function getDeviceModel() {
    const ua = navigator.userAgent;
    let model = "Unknown Device";

    if (/android/i.test(ua)) {
        const match = ua.match(/;\s*([^;)]+)\s*Build/i);
        model = match ? match[1].trim() : "Android Generic";
    } else if (/iPhone/i.test(ua)) {
        model = "Apple iPhone";
    } else if (/iPad/i.test(ua)) {
        model = "Apple iPad";
    } else if (/Windows NT/i.test(ua)) {
        model = "Windows PC";
    } else if (/Macintosh/i.test(ua)) {
        model = "Macintosh";
    } else if (/Linux/i.test(ua)) {
        model = "Linux PC";
    }
    return model;
}
