
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
   PIN STATE
========================= */

let currentPin =
    "";


let firstPin =
    "";


let confirmingPin =
    false;


/* =========================
   ELEMENTS
========================= */

const setupPinDots =
    document.querySelectorAll(
        "#setupPinDots span"
    );


const setupPinStatus =
    document.getElementById(
        "setupPinStatus"
    );


const setupPinSubtitle =
    document.getElementById(
        "setupPinSubtitle"
    );


const setupDeleteButton =
    document.getElementById(
        "setupDeleteButton"
    );


const digitButtons =
    document.querySelectorAll(
        "[data-digit]"
    );


/* =========================
   MESSAGE
========================= */

function showMessage(
    message
) {

    setupPinStatus.textContent =
        message;

}


/* =========================
   UPDATE DOTS
========================= */

function updateDots() {

    setupPinDots.forEach(
        (
            dot,
            index
        ) => {

            dot.classList.toggle(
                "filled",
                index <
                    currentPin.length
            );

        }
    );

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
   ADD DIGIT
========================= */

function addDigit(
    digit
) {

    if (
        currentPin.length >= 5
    ) {

        return;

    }


    currentPin +=
        digit;


    updateDots();


    if (
        currentPin.length === 5
    ) {

        setTimeout(
            processPin,
            150
        );

    }

}


/* =========================
   DELETE DIGIT
========================= */

function deleteDigit() {

    if (
        currentPin.length === 0
    ) {

        return;

    }


    currentPin =
        currentPin.slice(
            0,
            -1
        );


    updateDots();

    showMessage("");

}


/* =========================
   PROCESS PIN
========================= */

function processPin() {

    /*
       FIRST ENTRY
    */

    if (
        !confirmingPin
    ) {

        firstPin =
            currentPin;


        currentPin =
            "";


        confirmingPin =
            true;


        updateDots();


        setupPinSubtitle.textContent =
            "Enter your PIN again to confirm.";


        showMessage(
            "Please confirm your PIN."
        );


        return;

    }


    /*
       CONFIRMATION
    */

    if (
        currentPin !==
        firstPin
    ) {

        currentPin =
            "";


        firstPin =
            "";


        confirmingPin =
            false;


        updateDots();


        setupPinSubtitle.textContent =
            "Create a 5-digit PIN to protect your game.";


        showMessage(
            "The PINs do not match. Please try again."
        );


        return;

    }


    createPin(
        currentPin
    );

}


/* =========================
   CREATE PIN
========================= */

async function createPin(
    pin
) {

    disableKeypad();


    showMessage(
        "Creating PIN..."
    );


    try {

        /* =========================
           GET CURRENT USER
        ========================= */

        const {
            data,
            error
        } =
            await db.auth.getSession();


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

        const {
            data:
                result,
            error:
                createError
        } =
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
            createError
        ) {

            throw createError;

        }


        /* =========================
           SUCCESS
        ========================= */

        if (
            result &&
            result.success
        ) {

            showMessage(
                "PIN created successfully!"
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        800
                    )
            );


            window.location.href =
                "pin.html";

            return;

        }


        /* =========================
           ERROR RESPONSE
        ========================= */

        console.error(
            "PIN CREATE RESPONSE:",
            result
        );


        showMessage(
            result?.error ||
            "Could not create PIN."
        );


        enableKeypad();


    } catch (
        error
    ) {

        console.error(
            "PIN CREATION ERROR:",
            error
        );


        showMessage(
            "Could not create PIN. Please try again."
        );


        enableKeypad();

    }

}


/* =========================
   DISABLE KEYPAD
========================= */

function disableKeypad() {

    digitButtons.forEach(
        button => {

            button.disabled =
                true;

        }
    );


    setupDeleteButton.disabled =
        true;

}


/* =========================
   ENABLE KEYPAD
========================= */

function enableKeypad() {

    digitButtons.forEach(
        button => {

            button.disabled =
                false;

        }
    );


    setupDeleteButton.disabled =
        false;

}


/* =========================
   BUTTON EVENTS
========================= */

digitButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                addDigit(
                    button.dataset.digit
                );

            }
        );

    }
);


setupDeleteButton.addEventListener(
    "click",
    deleteDigit
);


/* =========================
   CHECK LOGIN
========================= */

async function checkLogin() {

    const {
        data,
        error
    } =
        await db.auth.getSession();


    if (
        error ||
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
   START
========================= */

checkLogin();
