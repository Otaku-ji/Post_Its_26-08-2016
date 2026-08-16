const SUPABASE_URL =
    "https://vaqmavrjvjktqijlpxst.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_1VBFWiNkHPz5XmLHP_v8KA_iJHKwrCg";


const db =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const pinForm =
    document.getElementById(
        "pinForm"
    );

const pinInput =
    document.getElementById(
        "pinInput"
    );

const pinButton =
    document.getElementById(
        "pinButton"
    );

const pinStatus =
    document.getElementById(
        "pinStatus"
    );


/* =========================
   CHECK LOGIN
========================= */

async function checkLogin() {

    const {
        data,
        error
    } = await db.auth.getSession();


    if (error) {

        console.error(
            "SESSION ERROR:",
            error
        );

    }


    if (
        !data ||
        !data.session
    ) {

        window.location.href =
            "login.html";

        return false;

    }


    return true;

}


/* =========================
   PIN HASH
========================= */

async function hashPin(
    pin
) {

    const encoder =
        new TextEncoder();


    const data =
        encoder.encode(
            pin
        );


    const hash =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    return Array
        .from(
            new Uint8Array(
                hash
            )
        )
        .map(
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        )
        .join("");

}


/* =========================
   CHECK PIN
========================= */

async function checkPin() {

    const {
        data,
        error
    } = await db.auth.getSession();


    if (
        error ||
        !data ||
        !data.session
    ) {

        window.location.href =
            "login.html";

        return;

    }


    const userId =
        data.session.user.id;


    const pin =
        pinInput.value;


    if (
        !/^\d{5}$/.test(
            pin
        )
    ) {

        pinStatus.textContent =
            "Please enter a 5-digit PIN.";

        return;

    }


    pinButton.disabled =
        true;

    pinStatus.textContent =
        "Checking PIN...";


    try {

        const pinHash =
            await hashPin(
                pin
            );


        const response =
            await db.functions.invoke(
                "pin",
                {
                    body: {
                        action:
                            "check",

                        user_id:
                            userId,

                        pin_hash:
                            pinHash
                    }
                }
            );


        if (response.error) {

            throw response.error;

        }


        const result =
            response.data;


        /* =========================
           CORRECT PIN
        ========================= */

        if (
            result.success
        ) {

            /*
               Remember that the PIN
               has been successfully
               entered on this device.
            */

            sessionStorage.setItem(
                "postit_pin_unlocked",
                "true"
            );


            window.location.href =
                "index.html";

            return;

        }


        /* =========================
           PERMANENT LOCK
        ========================= */

        if (
            result.permanently_locked
        ) {

            pinStatus.textContent =
                "This PIN is permanently locked. An administrator must reset it.";

            pinInput.value = "";

            pinButton.disabled =
                true;

            return;

        }


        /* =========================
           15 MINUTE LOCK
        ========================= */

        if (
            result.locked_until
        ) {

            const lockedUntil =
                new Date(
                    result.locked_until
                );


            const minutes =
                Math.ceil(
                    (
                        lockedUntil.getTime() -
                        Date.now()
                    ) /
                    60000
                );


            pinStatus.textContent =
                `Too many incorrect attempts. Try again in ${minutes} minute(s).`;

            pinInput.value = "";

            pinButton.disabled =
                true;

            return;

        }


        /* =========================
           WRONG PIN
        ========================= */

        const attempts =
            result.failed_attempts ||
            0;


        const remaining =
            5 -
            attempts;


        if (
            attempts < 5
        ) {

            pinStatus.textContent =
                `Incorrect PIN. ${remaining} attempt(s) remaining before the 15-minute lock.`;

        }


        pinInput.value = "";

        pinInput.focus();

        pinButton.disabled =
            false;


    } catch (error) {

        console.error(
            "PIN ERROR:",
            error
        );


        pinStatus.textContent =
            "Could not check PIN. Please try again.";

        pinButton.disabled =
            false;

    }

}


/* =========================
   FORM
========================= */

pinForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        checkPin();

    }
);


/* =========================
   START
========================= */

checkLogin();