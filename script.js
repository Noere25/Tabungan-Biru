const USERS_KEY = "kp_demo_users_v1";
const SESSION_KEY = "kp_demo_session_v1";
const TRANSACTION_PREFIX = "kp_demo_transactions_v1_";

let currentUser = null;
let transactions = [];

function showPage(pageId) {
    ["loginPage", "registerPage", "dashboardPage"].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });

    document.getElementById(pageId).classList.remove("hidden");

    document.getElementById("loginMessage").textContent = "";
    document.getElementById("registerMessage").textContent = "";
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);

    if (input.type === "password") {
        input.type = "text";
        button.textContent = "Sembunyikan";
    } else {
        input.type = "password";
        button.textContent = "Tampilkan";
    }
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
    } catch {
        return {};
    }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password) {
    if (!window.crypto?.subtle) {
        throw new Error(
            "Fitur keamanan tidak tersedia. Buka index.html melalui browser modern atau localhost."
        );
    }

    const data = new TextEncoder().encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hash))
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
}

function dataKey(username) {
    return TRANSACTION_PREFIX + username;
}

function loadTransactions(username) {
    try {
        return JSON.parse(localStorage.getItem(dataKey(username))) || [];
    } catch {
        return [];
    }
}

function saveTransactions() {
    if (!currentUser) return;

    localStorage.setItem(
        dataKey(currentUser),
        JSON.stringify(transactions)
    );
}

function formatRupiah(amount) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(amount);
}

function enterDashboard(username) {
    currentUser = username;
    transactions = loadTransactions(username);

    document.getElementById("welcomeUser").textContent = username;
    document.getElementById("transactionDate").value =
        new Date().toLocaleDateString("en-CA");

    showPage("dashboardPage");
    renderTransactions();
}

function showMessage(elementId, message, type = "error") {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = "message " + type;
}


// REGISTRASI
document.getElementById("registerForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("registerUsername")
        .value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (username.length < 3) {
        return showMessage(
            "registerMessage",
            "Username minimal 3 karakter."
        );
    }

    if (password.length < 6) {
        return showMessage(
            "registerMessage",
            "Kata sandi minimal 6 karakter."
        );
    }

    if (password !== confirmPassword) {
        return showMessage(
            "registerMessage",
            "Konfirmasi kata sandi tidak cocok."
        );
    }

    try {
        const users = getUsers();

        if (users[username]) {
            return showMessage(
                "registerMessage",
                "Username sudah digunakan."
            );
        }

        const passwordHash = await hashPassword(password);

        // Periksa kembali data sebelum menyimpan.
        const latestUsers = getUsers();

        if (latestUsers[username]) {
            return showMessage(
                "registerMessage",
                "Username sudah digunakan."
            );
        }

        latestUsers[username] = { passwordHash };
        saveUsers(latestUsers);

        this.reset();

        showMessage(
            "loginMessage",
            "Registrasi berhasil! Silakan login.",
            "success"
        );

        showPage("loginPage");
        showMessage(
            "loginMessage",
            "Registrasi berhasil! Silakan login.",
            "success"
        );
    } catch (error) {
        showMessage("registerMessage", error.message);
    }
});


// LOGIN
document.getElementById("loginForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("loginUsername")
        .value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const users = getUsers();
        const user = users[username];

        if (!user || !user.passwordHash) {
            return showMessage(
                "loginMessage",
                "Username tidak ditemukan. Pastikan menggunakan akun yang didaftarkan."
            );
        }

        const passwordHash = await hashPassword(password);

        if (passwordHash !== user.passwordHash) {
            return showMessage(
                "loginMessage",
                "Kata sandi salah. Periksa kembali huruf besar, huruf kecil, dan angka."
            );
        }

        sessionStorage.setItem(SESSION_KEY, username);
        this.reset();

        enterDashboard(username);
    } catch (error) {
        showMessage("loginMessage", error.message);
    }
});


// TAMBAH TRANSAKSI
document.getElementById("transactionForm").addEventListener("submit", function(event) {
    event.preventDefault();

    if (!currentUser) return;

    const type = document.getElementById("transactionType").value;
    const name = document.getElementById("transactionName").value.trim();
    const amount = Number(
        document.getElementById("transactionAmount").value
    );
    const date = document.getElementById("transactionDate").value;

    if (!name || !Number.isSafeInteger(amount) || amount <= 0 || !date) {
        return showMessage(
            "transactionMessage",
            "Periksa nama, tanggal, dan nominal transaksi."
        );
    }

    transactions.push({
        id: Date.now().toString() + Math.random().toString(16).slice(2),
        type,
        name,
        amount,
        date
    });

    saveTransactions();
    renderTransactions();
    this.reset();

    document.getElementById("transactionDate").value =
        new Date().toLocaleDateString("en-CA");

    showMessage(
        "transactionMessage",
        "Transaksi berhasil disimpan.",
        "success"
    );
});


// TAMPILKAN TRANSAKSI
function renderTransactions() {
    let income = 0;
    let expense = 0;

    transactions.forEach(transaction => {
        if (transaction.type === "income") {
            income += transaction.amount;
        } else {
            expense += transaction.amount;
        }
    });

    document.getElementById("totalIncome").textContent =
        formatRupiah(income);

    document.getElementById("totalExpense").textContent =
        formatRupiah(expense);

    document.getElementById("balance").textContent =
        formatRupiah(income - expense);

    const list = document.getElementById("transactionList");
    const emptyMessage = document.getElementById("emptyMessage");

    list.replaceChildren();

    emptyMessage.classList.toggle("hidden", transactions.length > 0);

    const sortedTransactions = [...transactions].sort((a, b) => {
        return b.date.localeCompare(a.date);
    });

    sortedTransactions.forEach(transaction => {
        const row = document.createElement("tr");

        const values = [
            transaction.date,
            transaction.name,
            transaction.type === "income" ? "Pemasukan" : "Pengeluaran",
            formatRupiah(transaction.amount)
        ];

        values.forEach((value, index) => {
            const cell = document.createElement("td");
            cell.textContent = value;

            if (index === 2) {
                cell.className =
                    transaction.type === "income" ? "income" : "expense";
            }

            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");

        deleteButton.textContent = "Hapus";
        deleteButton.className = "danger delete-btn";

        deleteButton.addEventListener("click", function() {
            if (!confirm("Hapus transaksi ini?")) return;

            transactions = transactions.filter(item =>
                item.id !== transaction.id
            );

            saveTransactions();
            renderTransactions();
        });

        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        list.appendChild(row);
    });
}


// LOGOUT
function logout() {
    sessionStorage.removeItem(SESSION_KEY);

    currentUser = null;
    transactions = [];

    document.getElementById("loginForm").reset();
    document.getElementById("registerForm").reset();
    document.getElementById("transactionForm").reset();

    document.querySelectorAll(".password-wrap input").forEach(input => {
        input.type = "password";
    });

    document.querySelectorAll(".password-wrap button").forEach(button => {
        button.textContent = "Tampilkan";
    });

    showPage("loginPage");
}


// PULIHKAN SESI JIKA MASIH ADA
(function restoreSession() {
    try {
        const savedSession = sessionStorage.getItem(SESSION_KEY);
        const savedUsers = getUsers();

        if (savedSession && savedUsers[savedSession]) {
            enterDashboard(savedSession);
        } else {
            sessionStorage.removeItem(SESSION_KEY);
            showPage("loginPage");
        }
    } catch {
        showPage("loginPage");
    }
})();
