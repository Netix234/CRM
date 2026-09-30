const ACCOUNT_KEY = "kizexCRMData";
const SESSION_KEY = "kizexCRMLogged";


/* =========================
   ACCOUNT
========================= */

function getAccount() {
    const data = localStorage.getItem(ACCOUNT_KEY);

    if (!data) {
        return null;
    }

    try {
        return JSON.parse(data);
    } catch {
        return null;
    }
}


function saveAccount(account) {
    localStorage.setItem(
        ACCOUNT_KEY,
        JSON.stringify(account)
    );
}


/* =========================
   SCREENS
========================= */

function showLogin() {

    const register = document.getElementById("registerScreen");
    const login = document.getElementById("loginScreen");

    if (!register || !login) return;

    register.classList.add("hidden");
    login.classList.remove("hidden");

    clearErrors();
}


function showRegister() {

    const register = document.getElementById("registerScreen");
    const login = document.getElementById("loginScreen");

    if (!register || !login) return;

    login.classList.add("hidden");
    register.classList.remove("hidden");

    clearErrors();
}


function clearErrors() {

    const registerError =
        document.getElementById("registerError");

    const loginError =
        document.getElementById("loginError");

    if (registerError) {
        registerError.textContent = "";
    }

    if (loginError) {
        loginError.textContent = "";
    }
}


/* =========================
   PASSWORD VISIBILITY
========================= */

function togglePassword(inputId, button) {

    const input = document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {

        input.type = "text";

        button.textContent = "🙈";

    } else {

        input.type = "password";

        button.textContent = "👁";

    }
}


/* =========================
   REGISTER
========================= */

function registerAccount(event) {

    event.preventDefault();

    const storeInput =
        document.getElementById("registerStore");

    const passwordInput =
        document.getElementById("registerPassword");

    const password2Input =
        document.getElementById("registerPassword2");

    const error =
        document.getElementById("registerError");

    const store =
        storeInput.value.trim();

    const password =
        passwordInput.value;

    const password2 =
        password2Input.value;


    if (store.length < 2) {

        error.textContent =
            "Введите название магазина.";

        return;
    }


    if (password.length < 4) {

        error.textContent =
            "Пароль должен содержать минимум 4 символа.";

        return;
    }


    if (password !== password2) {

        error.textContent =
            "Пароли не совпадают.";

        return;
    }


    const existingAccount = getAccount();

    if (existingAccount) {

        error.textContent =
            "Аккаунт уже существует.";

        return;
    }


    const account = {

        accountCreated:
            new Date().toISOString(),

        storeName:
            store,

        password:
            password,

        orders: [],

        clients: [],

        products: []

    };


    saveAccount(account);


    /*

       После регистрации
       автоматически подставляем
       магазин в форму входа.

    */

    const loginStore =
        document.getElementById("loginStore");

    if (loginStore) {
        loginStore.value = store;
    }


    const loginPassword =
        document.getElementById("loginPassword");

    if (loginPassword) {
        loginPassword.value = "";
    }


    showLogin();


    const loginError =
        document.getElementById("loginError");

    if (loginError) {

        loginError.textContent =
            "Аккаунт создан. Теперь войдите.";

        loginError.style.color = "#8cff9a";

    }


    passwordInput.value = "";
    password2Input.value = "";
}


/* =========================
   LOGIN
========================= */

function loginAccount(event) {

    event.preventDefault();

    const storeInput =
        document.getElementById("loginStore");

    const passwordInput =
        document.getElementById("loginPassword");

    const remember =
        document.getElementById("remember");

    const error =
        document.getElementById("loginError");


    const store =
        storeInput.value.trim();

    const password =
        passwordInput.value;


    const account =
        getAccount();


    if (!account) {

        error.textContent =
            "Аккаунт не найден. Сначала создайте аккаунт.";

        return;
    }


    if (
        store !== account.storeName ||
        password !== account.password
    ) {

        error.textContent =
            "Неверное название магазина или пароль.";

        return;
    }


    /*
        Запоминаем авторизацию.
    */

    if (remember && remember.checked) {

        localStorage.setItem(
            SESSION_KEY,
            "true"
        );

    } else {

        sessionStorage.setItem(
            SESSION_KEY,
            "true"
        );

    }


    /*
        Переход в CRM.
    */

    window.location.href =
        "dashboard.html";
}


/* =========================
   LOGOUT
========================= */

function logout() {

    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);

    window.location.href =
        "index.html";
}


/* =========================
   CHECK AUTH
========================= */

function isLoggedIn() {

    return (
        localStorage.getItem(SESSION_KEY) === "true" ||
        sessionStorage.getItem(SESSION_KEY) === "true"
    );
}


/* =========================
   DASHBOARD PROTECTION
========================= */

function protectDashboard() {

    const isDashboard =
        window.location.pathname.includes(
            "dashboard.html"
        );

    if (!isDashboard) return;

    if (!isLoggedIn()) {

        window.location.href =
            "index.html";

    }

}


/* =========================
   INIT
========================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const registerForm =
            document.getElementById("registerForm");

        const loginForm =
            document.getElementById("loginForm");


        if (registerForm) {

            registerForm.addEventListener(
                "submit",
                registerAccount
            );

        }


        if (loginForm) {

            loginForm.addEventListener(
                "submit",
                loginAccount
            );

        }


        const account =
            getAccount();


        /*
            Если аккаунта ещё нет —
            показываем регистрацию.

            Если аккаунт уже существует —
            показываем вход.
        */

        if (account) {

            showLogin();

            const loginStore =
                document.getElementById("loginStore");

            if (loginStore) {
                loginStore.value =
                    account.storeName;
            }

        } else {

            showRegister();

        }


        protectDashboard();

    }
);