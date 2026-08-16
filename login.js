const SUPABASE_URL =
    "https://vaqmavrjvjktqijlpxst.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_1VBFWiNkHPz5XmLHP_v8KA_iJHKwrCg";


const db =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );

const emailInput =
    document.getElementById(
        "email"
    );

const passwordInput =
    document.getElementById(
        "password"
    );

const loginButton =
    document.getElementById(
        "loginButton"
    );

const loginStatus =
    document.getElementById(
        "loginStatus"
    );


/* =========================
   CHECK EXISTING LOGIN
========================= */

async function checkExistingSession() {

    const {
        data,
        error
    } = await db.auth.getSession();


    if (error) {

        console.error(
            "SESSION ERROR:",
            error
        );

        return;

    }


    if (
        data.session
    ) {

        window.location.href =
            "index.html";

    }

}


/* =========================
   LOGIN
========================= */

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();


        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;


        loginButton.disabled =
            true;


        loginButton.textContent =
            "Logging in...";


        loginStatus.textContent =
            "";


        const {
            error
        } = await db.auth.signInWithPassword({
            email:
                email,
            password:
                password
        });


        if (error) {

            console.error(
                "LOGIN ERROR:",
                error
            );


            loginStatus.textContent =
                "Incorrect email or password.";


            loginButton.disabled =
                false;


            loginButton.textContent =
                "Login";


            return;

        }


        window.location.href =
            "index.html";

    }
);


/* =========================
   START
========================= */

checkExistingSession();