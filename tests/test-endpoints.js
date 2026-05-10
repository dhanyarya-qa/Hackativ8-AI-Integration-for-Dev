// test-endpoints.js — Script untuk testing semua endpoint
const BASE = "http://localhost:3000";

async function test(name, url, options) {
    console.log(`\n${"═".repeat(60)}`);
    console.log(`🧪 TEST: ${name}`);
    console.log(`   ${options.method} ${url}`);
    console.log("═".repeat(60));
    try {
        const start = Date.now();
        const res = await fetch(url, options);
        const elapsed = Date.now() - start;
        const data = await res.json().catch(() => res.text());
        console.log(`   Status : ${res.status}`);
        console.log(`   Time   : ${elapsed}ms`);
        console.log(`   Response:`, JSON.stringify(data, null, 2));
        return { name, status: res.status, pass: res.status === 200, elapsed, data };
    } catch (err) {
        console.log(`   ❌ ERROR: ${err.message}`);
        return { name, status: 0, pass: false, elapsed: 0, error: err.message };
    }
}

async function run() {
    const results = [];

    // ── Test 1: generate-text (valid) ──────────────────────
    results.push(await test(
        "1. generate-text (valid prompt)",
        `${BASE}/generate-text`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "Apa itu machine learning? Jawab singkat 2 kalimat." }),
        }
    ));

    // ── Test 2: generate-text (missing prompt - negative) ──
    results.push(await test(
        "2. generate-text (missing prompt - negative test)",
        `${BASE}/generate-text`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        }
    ));

    // ── Test 3: generate-text (empty prompt - negative) ────
    results.push(await test(
        "3. generate-text (empty prompt - negative test)",
        `${BASE}/generate-text`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "" }),
        }
    ));

    // ── Test 4: generate-from-image (no file - negative) ──
    results.push(await test(
        "4. generate-from-image (no file - negative test)",
        `${BASE}/generate-from-image`,
        { method: "POST" }
    ));

    // ── Test 5: generate-from-document (no file - negative) 
    results.push(await test(
        "5. generate-from-document (no file - negative test)",
        `${BASE}/generate-from-document`,
        { method: "POST" }
    ));

    // ── Test 6: generate-from-audio (no file - negative) ──
    results.push(await test(
        "6. generate-from-audio (no file - negative test)",
        `${BASE}/generate-from-audio`,
        { method: "POST" }
    ));

    // ── Test 7: journal/upload (no file - negative) ────────
    results.push(await test(
        "7. journal/upload (no file - negative test)",
        `${BASE}/api/v1/journal/upload`,
        { method: "POST" }
    ));

    // ── Test 8: journal/chat (valid prompt, no files) ──────
    results.push(await test(
        "8. journal/chat (prompt only, no files)",
        `${BASE}/api/v1/journal/chat`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "Halo, siapa kamu?" }),
        }
    ));

    // ── Test 9: journal/chat (missing prompt - negative) ───
    results.push(await test(
        "9. journal/chat (missing prompt - negative test)",
        `${BASE}/api/v1/journal/chat`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: [] }),
        }
    ));

    // ── Test 10: generate-from-image (with real image) ─────
    // Create a small test PNG (1x1 pixel red)
    const fs = await import("fs");
    const path = await import("path");

    // Minimal valid PNG (1x1 red pixel)
    const pngHex = "89504e470d0a1a0a0000000d49484452000000010000000108020000009001" +
        "2e00000000c4944415478da6260f8cf0000000201014898506100000000" +
        "49454e44ae426082";
    const pngBuf = Buffer.from(pngHex, "hex");
    const testImgPath = path.default.join(process.cwd(), "test_image.png");
    fs.default.writeFileSync(testImgPath, pngBuf);

    const formImg = new FormData();
    const imgBlob = new Blob([fs.default.readFileSync(testImgPath)], { type: "image/png" });
    formImg.append("file", imgBlob, "test_image.png");
    formImg.append("prompt", "Apa warna gambar ini?");

    results.push(await test(
        "10. generate-from-image (with test image)",
        `${BASE}/generate-from-image`,
        { method: "POST", body: formImg }
    ));

    // Cleanup test file
    try { fs.default.unlinkSync(testImgPath); } catch {}

    // ── Test 11: journal/chat (invalid files array) ────────
    results.push(await test(
        "11. journal/chat (invalid files - missing fileUri)",
        `${BASE}/api/v1/journal/chat`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: "test", files: [{ mimeType: "application/pdf" }] }),
        }
    ));

    // ═══════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════
    console.log(`\n\n${"═".repeat(60)}`);
    console.log("📊 TEST SUMMARY");
    console.log("═".repeat(60));

    const passed = [];
    const failed = [];

    for (const r of results) {
        const expectedPass = !r.name.includes("negative") && !r.name.includes("invalid");
        const isNegativeTest = r.name.includes("negative") || r.name.includes("invalid");
        
        let actualPass;
        if (isNegativeTest) {
            // Negative tests should return 400
            actualPass = r.status === 400;
        } else {
            actualPass = r.status === 200;
        }

        const icon = actualPass ? "✅" : "❌";
        console.log(`  ${icon} ${r.name} — HTTP ${r.status} (${r.elapsed}ms)`);

        if (actualPass) passed.push(r);
        else failed.push(r);
    }

    console.log(`\n  Total: ${results.length} | ✅ Passed: ${passed.length} | ❌ Failed: ${failed.length}`);
    console.log("═".repeat(60));
}

run();
