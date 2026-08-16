const SUPABASE_URL =
    "https://vaqmavrjvjktqijlpxst.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_1VBFWiNkHPz5XmLHP_v8KA_iJHKwrCg";


/* =========================
   SUPABASE
========================= */

const db =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================
   ELEMENTS
========================= */

const setupPinForm =
    document.getElementById(
        "setupPinForm"
    );

const pinInput =
    document.getElementById(
        "pinInput"
    );

const confirmPinInput =
    document.getElementById(
        "confirmPinInput"
    );

const setupPinButton =
    document.getElementById(
        "setupPinButton"
    );

const setupPinStatus =
    document.getElementById(
        "setupPinStatus"
    );


/* =========================
   ONLY ALLOW NUMBERS
========================= */

pinInput.addEventListener(
    "input",
    () => {

        pinInput.value =
            pinInput.value.replace(
                /\D/g,
                ""
            );

    }
);


confirmPinInput.addEventListener(
    "input",
    () => {

        confirmPinInput.value =
            confirmPinInput.value.replace(
                /\D/g,
                ""
            );

    }
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
   HASH PIN
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
   CREATE PIN
========================= */

async function createPin() {

    const pin =
        pinInput.value;

    const confirmPin =
        confirmPinInput.value;


    /* =========================
       VALIDATE PIN
    ========================= */

    if (
        !/^\d{5}$/.test(
            pin
        )
    ) {

        setupPinStatus.textContent =
            "PIN must contain exactly 5 digits.";

        pinInput.focus();

        return;

    }


    if (
        pin !== confirmPin
    ) {

        setupPinStatus.textContent =
            "The PINs do not match.";

        confirmPinInput.value = "";

        confirmPinInput.focus();

        return;

    }


    setupPinButton.disabled =
        true;


    setupPinStatus.textContent =
        "Creating PIN...";


    try {

        /* =========================
           GET CURRENT USER
        ========================= */

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


        /* =========================
           HASH PIN
        ========================= */

        const pinHash =
            await hashPin(
                pin
            );


        /* =========================
           SEND TO EDGE FUNCTION
        ========================= */

        const response =
            await db.functions.invoke(
                "pin",
                {
                    body: {
                        action:
                            "create",

                        user_id:
                            userId,

                        pin_hash:
                            pinHash
                    }
                }
            );


        if (
            response.error
        ) {

            throw response.error;

        }


        const result =
            response.data;


        /* =========================
           SUCCESS
        ========================= */

        if (
            result &&
            result.success
        ) {

            setupPinStatus.textContent =
                "PIN created successfully!";


            /*
               Give the user a moment
               to see the message.
            */

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        800
                    )
            );


            /*
               Go to the PIN screen.
            */

            window.location.href =
                "pin.html";

            return;

        }


        /* =========================
           FUNCTION ERROR
        ========================= */

        console.error(
            "PIN CREATE RESPONSE:",
            result
        );


        setupPinStatus.textContent =
            result?.error ||
            "Could not create PIN.";


        setupPinButton.disabled =
            false;


    } catch (error) {

        console.error(
            "PIN CREATION ERROR:",
            error
        );


        setupPinStatus.textContent =
            "Could not create PIN. Please try again.";


        setupPinButton.disabled =
            false;

    }

}


/* =========================
   FORM
========================= */

setupPinForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        createPin();

    }
);


/* =========================
   START
========================= */

checkLogin();