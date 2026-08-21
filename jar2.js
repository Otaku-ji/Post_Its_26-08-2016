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
   GAME DATA
========================= */

let allJar2Notes = [];
let availableJar2Notes = [];
let collectedJar2Notes = [];

let currentUser = null;


/* =========================
   ELEMENTS
========================= */

const remainingElement =
    document.getElementById(
        "jar2Remaining"
    );

const jarElement =
    document.getElementById(
        "jar2"
    );

const jarNotesElement =
    document.getElementById(
        "jar2Notes"
    );

const statusElement =
    document.getElementById(
        "jar2Status"
    );

const modal =
    document.getElementById(
        "jar2NoteModal"
    );

const bigNote =
    document.getElementById(
        "jar2BigNote"
    );

const noteCategory =
    document.getElementById(
        "jar2NoteCategory"
    );

const noteText =
    document.getElementById(
        "jar2NoteText"
    );

const noteDate =
    document.getElementById(
        "jar2NoteDate"
    );

const collectionButton =
    document.getElementById(
        "jar2CollectionButton"
    );

const resetButton =
    document.getElementById(
        "jar2ResetButton"
    );

const jar2Button =
    document.getElementById(
        "jar2Button"
    );

/* =========================
   OG JAR PHOTO
========================= */

const ogButton =
    document.getElementById(
        "ogButton"
    );

const ogOverlay =
    document.getElementById(
        "ogOverlay"
    );

const ogImage =
    document.getElementById(
        "ogImage"
    );

const OG_JAR_IMAGE =
    "OG_JAR.jpeg";


async function showOGJar() {

    if (!db) {

        console.error(
            "Supabase is not available."
        );

        return;

    }


    try {

        const {
            data,
            error
        } =
            await db.storage
                .from("postit-images")
                .createSignedUrl(
                    OG_JAR_IMAGE,
                    60 * 60
                );


        if (
            error ||
            !data ||
            !data.signedUrl
        ) {

            console.error(
                "OG IMAGE ERROR:",
                error
            );

            return;

        }


        ogImage.src =
            data.signedUrl;


        ogImage.onload =
            () => {

                ogOverlay.classList.add(
                    "visible"
                );

            };


    } catch (error) {

        console.error(
            "OG IMAGE ERROR:",
            error
        );

    }

}


if (ogButton) {

    ogButton.addEventListener(
        "click",
        showOGJar
    );

}


if (ogOverlay) {

    ogOverlay.addEventListener(
        "click",
        () => {

            ogOverlay.classList.remove(
                "visible"
            );


            ogImage.src =
                "";

        }
    );

}


/* =========================
   AUTHENTICATION
========================= */

async function loadCurrentUser() {

    const {
        data,
        error
    } = await db.auth.getSession();


    if (error) {

        console.error(
            "JAR 2 AUTH ERROR:",
            error
        );

        return false;

    }


    if (
        !data ||
        !data.session ||
        !data.session.user
    ) {

        window.location.href =
            "login.html";

        return false;

    }


    currentUser =
        data.session.user;


    return true;

}


/* =========================
   LOAD NOTES
========================= */

async function loadJar2() {

    statusElement.textContent =
        "Loading jar...";


    try {

        /*
           Load all active notes.
        */

       const {
            data: notes,
            error: notesError
        } = await db
            .from("jar2_notes")
            .select(`
                *,
                jar2_categories!jar2_notes_category_fkey (
                    name,
                    color
                )
            `)
            .eq(
                "active",
                true
            )
            .order("id");


        if (notesError) {

            throw notesError;

        }


     console.log("JAR 2 NOTES FROM SUPABASE:", notes);

allJar2Notes =
    (notes || []).map(
        note => {

            return {
                ...note,

                category:
                    note.jar2_categories?.name ||
                    note.category,

                color:
                    note.jar2_categories?.color ||
                    "White"

            };

        }
    );

        const {
            data: collections,
            error: collectionsError
        } = await db
            .from("jar2_collections")
            .select(
                "note_id, drawn_at"
            )
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "drawn_at",
                {
                    ascending: true
                }
            );


        if (collectionsError) {

            throw collectionsError;

        }


        /*
           Store collection information
           together with the note.
        */

        const collectedIds =
            (collections || []).map(
                item =>
                    item.note_id
            );


        availableJar2Notes =
            allJar2Notes.filter(
                note =>
                    !collectedIds.includes(
                        note.id
                    )
            );


        collectedJar2Notes =
            allJar2Notes
                .filter(
                    note =>
                        collectedIds.includes(
                            note.id
                        )
                )
                .map(
                    note => {

                        const collection =
                            collections.find(
                                item =>
                                    item.note_id ===
                                    note.id
                            );


                        return {
                            ...note,

                            drawn_at:
                                collection
                                    ? collection.drawn_at
                                    : null
                        };

                    }
                );


        updateInterface();


        statusElement.textContent =
            availableJar2Notes.length === 0
                ? "You've collected every Post-it!"
                : "Tap the jar to draw a Post-it.";


    } catch (error) {

        console.error(
            "JAR 2 LOAD ERROR:",
            error
        );


        statusElement.textContent =
            "Could not load the Special Jar.";

    }

}


/* =========================
   UPDATE INTERFACE
========================= */

function updateInterface() {

    remainingElement.textContent =
        availableJar2Notes.length;


    renderJar();

}


/* =========================
   RENDER JAR
========================= */

function renderJar() {

    jarNotesElement.innerHTML =
        "";


    if (
        availableJar2Notes.length === 0
    ) {

        return;

    }


    const MAX_NOTES =
        Math.min(
            availableJar2Notes.length,
            70
        );


    const previewNotes = [];


    while (
        previewNotes.length <
        MAX_NOTES
    ) {

        const randomIndex =
            Math.floor(
                Math.random() *
                availableJar2Notes.length
            );


        previewNotes.push(
            availableJar2Notes[
                randomIndex
            ]
        );

    }


    previewNotes.forEach(
        source => {

            const note =
                document.createElement(
                    "div"
                );


            note.className =
                "mini-note " +
                convertColor(
                    source.color
                );


            note.style.left =
                `${random(2, 92)}%`;


            note.style.top =
                `${random(2, 92)}%`;


            note.style.setProperty(
                "--rotation",
                `${random(-20, 20)}deg`
            );


            jarNotesElement.appendChild(
                note
            );

        }
    );

}


/* =========================
   DRAW NOTE
========================= */

async function drawNote() {

    if (
        availableJar2Notes.length === 0
    ) {

        statusElement.textContent =
            "The jar is empty!";

        return;

    }


    jarElement.classList.add(
        "shaking"
    );


    statusElement.textContent =
        "Mixing the Post-its...";


    await wait(700);


    jarElement.classList.remove(
        "shaking"
    );


    jarElement.classList.add(
        "lid-open"
    );


    await wait(500);


    /*
       Select random note.
    */

    const randomIndex =
        Math.floor(
            Math.random() *
            availableJar2Notes.length
        );


    const note =
        availableJar2Notes[
            randomIndex
        ];


    /*
       The exact moment the note
       is drawn.
    */

    const drawnAt =
        new Date().toISOString();


    /*
       Save collection in Supabase.
    */

    const {
        data,
        error
    } = await db
        .from("jar2_collections")
        .insert({
            note_id:
                note.id,

            user_id:
                currentUser.id,

            drawn_at:
                drawnAt
        })
        .select()
        .single();


    if (error) {

        console.error(
            "JAR 2 COLLECTION ERROR:",
            error
        );


        jarElement.classList.remove(
            "lid-open"
        );


        statusElement.textContent =
            "Could not save the Post-it. Please try again.";

        return;

    }


    /*
       Update local state.
    */

    availableJar2Notes.splice(
        randomIndex,
        1
    );


    collectedJar2Notes.push({
        ...note,

        drawn_at:
            data.drawn_at
    });


    updateInterface();


    await wait(300);


    showNote({
        ...note,

        drawn_at:
            data.drawn_at
    });

}


/* =========================
   SHOW NOTE
========================= */

function showNote(note) {

    noteCategory.textContent =
        note.category || "";


    noteText.innerHTML =
        "";


    /*
       IMAGE NOTE
    */

    if (
        note.image_url
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            note.image_url;


        image.className =
            "note-image";


        image.alt =
            "Post-it image";


        noteText.appendChild(
            image
        );

    } else {

        noteText.textContent =
            note.text || "";

    }


    /*
       DRAW DATE
    */

    if (
        note.drawn_at
    ) {

        noteDate.textContent =
            formatDrawDate(
                note.drawn_at
            );

    } else {

        noteDate.textContent =
            "";

    }


    /*
       Apply sticky-note colour.
    */

    bigNote.className =
        `big-note ${convertColor(
            note.color
        )}`;


    modal.classList.add(
        "visible"
    );

}


/* =========================
   FORMAT DRAW DATE
========================= */

function formatDrawDate(
    dateString
) {

    const date =
        new Date(
            dateString
        );


    return date.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


/* =========================
   CLOSE NOTE
========================= */

bigNote.addEventListener(
    "click",
    () => {

        modal.classList.remove(
            "visible"
        );


        jarElement.classList.remove(
            "lid-open"
        );


        statusElement.textContent =
            availableJar2Notes.length === 0
                ? "You've collected every Post-it!"
                : "Tap the jar to draw another Post-it.";

    }
);


/* =========================
   JAR CLICK
========================= */

jarElement.addEventListener(
    "click",
    () => {

        if (
            availableJar2Notes.length > 0
        ) {

            drawNote();

        }

    }
);


/* =========================
   SWITCH JARS
========================= */

if (jar2Button) {

    jar2Button.addEventListener(
        "click",
        () => {

            window.location.href =
                "index.html";

        }
    );

}


/* =========================
   COLLECTION
========================= */

if (collectionButton) {

    collectionButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "jar2collection.html";

        }
    );

}


/* =========================
   RESET
========================= */

if (resetButton) {

    resetButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                window.confirm(
                    "Are you sure you want to reset the Special Jar?\n\nAll collected Post-its will be returned to the jar."
                );


            if (!confirmed) {

                return;

            }


            resetButton.disabled =
                true;


            resetButton.textContent =
                "Resetting...";


            try {

                const {
                    error
                } = await db
                    .from("jar2_collections")
                    .delete()
                    .eq(
                        "user_id",
                        currentUser.id
                    );


                if (error) {

                    throw error;

                }


                availableJar2Notes =
                    [...allJar2Notes];


                collectedJar2Notes =
                    [];


                updateInterface();


                statusElement.textContent =
                    "Jar has been reset! Tap the jar to draw a Post-it.";


            } catch (error) {

                console.error(
                    "JAR 2 RESET ERROR:",
                    error
                );


                statusElement.textContent =
                    "Could not reset the jar.";

            }


            resetButton.disabled =
                false;


            resetButton.textContent =
                "Reset Jar";

        }
    );

}


/* =========================
   COLOUR
========================= */

function convertColor(
    color
) {

    if (!color) {

        return "white";

    }


    return color
        .toLowerCase()
        .replaceAll(
            "_",
            "-"
        )
        .replaceAll(
            " ",
            "-"
        );

}


/* =========================
   RANDOM
========================= */

function random(
    min,
    max
) {

    return Math.random() *
        (max - min) +
        min;

}


/* =========================
   WAIT
========================= */

function wait(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


/* =========================
   START
========================= */

async function startJar2() {

    const loggedIn =
        await loadCurrentUser();


    if (!loggedIn) {

        return;

    }


    await loadJar2();

}


startJar2();