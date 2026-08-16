const SUPABASE_URL =
    "https://vaqmavrjvjktqijlpxst.supabase.co";


const SUPABASE_KEY =
    "sb_publishable_1VBFWiNkHPz5XmLHP_v8KA_iJHKwrCg";


const db =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


let currentPin = "";


const pinDots =
    document.querySelectorAll(
        "#pinDots span"
    );


const pinMessage =
    document.getElementById(
        "pinMessage"
    );


const deleteButton =
    document.getElementById(
        "deleteButton"
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

    pinMessage.textContent =
        message;

}


/* =========================
   UPDATE DOTS
========================= */

function updateDots() {

    pinDots.forEach(
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


    const hashBuffer =
        await crypto.subtle.digest(
            "SHA-256",
            data
        );


    const hashArray =
        Array.from(
            new Uint8Array(
                hashBuffer
            )
        );


    return hashArray
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

    showMessage(
        "Checking PIN..."
    );


    const {
        data:
            sessionData,
        error:
            sessionError
    } =
        await db.auth.getSession();


    if (
        sessionError ||
        !sessionData ||
        !sessionData.session
    ) {

        window.location.href =
            "login.html";

        return;

    }


    const userId =
        sessionData.session.user.id;


    const pinHash =
        await hashPin(
            currentPin
        );


    try {

        const {
            data,
            error
        } =
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


        if (error) {

            console.error(
                "PIN CHECK ERROR:",
                error
            );


            showMessage(
                "Could not check PIN."
            );

            currentPin = "";

            updateDots();

            return;

        }


        console.log(
            "PIN CHECK RESULT:",
            data
        );


        /* =========================
           CORRECT PIN
        ========================= */

        if (
            data &&
            data.success === true
        ) {

            /*
               PIN is correct.
               Allow access to the game.
            */

            sessionStorage.setItem(
                "pin_verified",
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
            data &&
            data.permanently_locked
        ) {

            showMessage(
                "This account is permanently locked."
            );


            disableKeypad();

            return;

        }


        /* =========================
           TEMPORARY LOCK
        ========================= */

        if (
            data &&
            data.locked_until
        ) {

            const lockedUntil =
                new Date(
                    data.locked_until
                );


            const minutes =
                Math.ceil(
                    (
                        lockedUntil -
                        new Date()
                    ) /
                    60000
                );


            showMessage(
                `Too many attempts. Try again in ${minutes} minute(s).`
            );


            disableKeypad();

            return;

        }


        /* =========================
           WRONG PIN
        ========================= */

        const attempts =
            data?.failed_attempts ??
            0;


        showMessage(
            `Incorrect PIN. Attempt ${attempts} of 8.`
        );


        currentPin = "";

        updateDots();

    } catch (error) {

        console.error(
            "PIN CHECK ERROR:",
            error
        );


        showMessage(
            "Could not check PIN."
        );


        currentPin = "";

        updateDots();

    }

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

        checkPin();

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
   DISABLE KEYPAD
========================= */

function disableKeypad() {

    digitButtons.forEach(
        button => {

            button.disabled =
                true;

        }
    );


    deleteButton.disabled =
        true;

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


deleteButton.addEventListener(
    "click",
    deleteDigit
);


/* =========================
   START
========================= */

async function startPinPage() {

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


    /*
       Check whether a PIN exists.
    */

    const userId =
        data.session.user.id;


    try {

        const {
            data:
                pinStatus,
            error:
                pinError
        } =
            await db.functions.invoke(
                "pin",
                {
                    body: {
                        action:
                            "status",

                        user_id:
                            userId
                    }
                }
            );


        if (pinError) {

            console.error(
                "PIN STATUS ERROR:",
                pinError
            );

            showMessage(
                "Could not load PIN status."
            );

            return;

        }


        if (
            !pinStatus ||
            !pinStatus.exists
        ) {

            window.location.href =
                "setup-pin.html";

            return;

        }


        if (
            pinStatus.permanently_locked
        ) {

            showMessage(
                "This account is permanently locked."
            );


            disableKeypad();

            return;

        }


        if (
            pinStatus.locked_until
        ) {

            const lockedUntil =
                new Date(
                    pinStatus.locked_until
                );


            if (
                lockedUntil >
                new Date()
            ) {

                const minutes =
                    Math.ceil(
                        (
                            lockedUntil -
                            new Date()
                        ) /
                        60000
                    );


                showMessage(
                    `Too many attempts. Try again in ${minutes} minute(s).`
                );


                disableKeypad();

                return;

            }

        }

    } catch (error) {

        console.error(
            "PIN STATUS ERROR:",
            error
        );


        showMessage(
            "Could not load PIN status."
        );

    }

}


startPinPage();