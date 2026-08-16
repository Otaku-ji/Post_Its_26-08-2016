const SUPABASE_URL =
    "https://vaqmavrjvjktqijlpxst.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_1VBFWiNkHPz5XmLHP_v8KA_iJHKwrCg";


/* =========================
   LOCAL STORAGE
========================= */

const NOTES_CACHE_KEY =
    "postit_notes_cache";

const CATEGORIES_CACHE_KEY =
    "postit_categories_cache";

const COLLECTION_CACHE_KEY =
    "postit_collection_cache";

const PENDING_COLLECTIONS_KEY =
    "postit_pending_collections";

const PENDING_RESET_KEY =
    "postit_pending_reset";


/* =========================
   SUPABASE
========================= */

let db = null;

if (
    typeof window.supabase !== "undefined"
) {

    db =
        window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );

}


/* =========================
   GAME DATA
========================= */

let allNotes = [];
let availableNotes = [];
let collectedNotes = [];
let categories = [];


/* =========================
   ELEMENTS
========================= */

const remainingElement =
    document.getElementById(
        "remaining"
    );

const collectedElement =
    document.getElementById(
        "collected"
    );

const jarElement =
    document.getElementById(
        "jar"
    );

const jarNotesElement =
    document.getElementById(
        "jarNotes"
    );

const statusElement =
    document.getElementById(
        "status"
    );

const modal =
    document.getElementById(
        "noteModal"
    );

const bigNote =
    document.getElementById(
        "bigNote"
    );

const noteCategory =
    document.getElementById(
        "noteCategory"
    );

const noteText =
    document.getElementById(
        "noteText"
    );

const collectionButton =
    document.getElementById(
        "collectionButton"
    );

const resetButton =
    document.getElementById(
        "resetButton"
    );


/* =========================
   BUTTON TEXT HELPERS
========================= */

function setResetButtonText(
    text
) {

    const textNode =
        Array.from(
            resetButton.childNodes
        ).find(
            node =>
                node.nodeType ===
                Node.TEXT_NODE
        );


    if (textNode) {

        textNode.textContent =
            `\n            ${text}\n\n        `;

    }

}


/* =========================
   LOCAL CACHE HELPERS
========================= */

function saveCache(
    key,
    value
) {

    try {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );

    } catch (error) {

        console.error(
            "Could not save local cache:",
            error
        );

    }

}


function loadCache(
    key,
    fallback
) {

    try {

        const stored =
            localStorage.getItem(
                key
            );


        if (!stored) {

            return fallback;

        }


        return JSON.parse(
            stored
        );

    } catch (error) {

        console.error(
            "Could not load local cache:",
            error
        );

        return fallback;

    }

}


/* =========================
   PENDING ACTIONS
========================= */

function getPendingCollections() {

    return loadCache(
        PENDING_COLLECTIONS_KEY,
        []
    );

}


function savePendingCollections(
    ids
) {

    saveCache(
        PENDING_COLLECTIONS_KEY,
        ids
    );

}


function isResetPending() {

    return loadCache(
        PENDING_RESET_KEY,
        false
    ) === true;

}


function setResetPending(
    value
) {

    saveCache(
        PENDING_RESET_KEY,
        value
    );

}


/* =========================
   SAVE LOCAL GAME
========================= */

function saveLocalGame() {

    saveCache(
        NOTES_CACHE_KEY,
        allNotes
    );


    saveCache(
        CATEGORIES_CACHE_KEY,
        categories
    );


    saveCache(
        COLLECTION_CACHE_KEY,
        collectedNotes.map(
            note =>
                note.id
        )
    );

}


/* =========================
   LOAD LOCAL GAME
========================= */

function loadLocalGame() {

    allNotes =
        loadCache(
            NOTES_CACHE_KEY,
            []
        );


    categories =
        loadCache(
            CATEGORIES_CACHE_KEY,
            []
        );


    const collectedIds =
        loadCache(
            COLLECTION_CACHE_KEY,
            []
        );


    availableNotes =
        allNotes.filter(
            note =>
                !collectedIds.includes(
                    note.id
                )
        );


    collectedNotes =
        allNotes.filter(
            note =>
                collectedIds.includes(
                    note.id
                )
        );


    return (
        allNotes.length > 0 &&
        categories.length > 0
    );

}


/* =========================
   SAVE COLLECTION LOCALLY
========================= */

function saveCollectedIds() {

    saveCache(
        COLLECTION_CACHE_KEY,
        collectedNotes.map(
            note =>
                note.id
        )
    );

}


/* =========================
   LOAD GAME
========================= */

async function loadGame() {

    statusElement.textContent =
        "Loading jar...";


    /*
       First load local data.
    */

    const hasLocalData =
        loadLocalGame();


    if (hasLocalData) {

        updateInterface();

        statusElement.textContent =
            availableNotes.length === 0
                ? "You've collected every Post-it!"
                : "Tap the jar to draw a Post-it.";

    }


    /*
       No Supabase or no internet:
       continue using local data.
    */

    if (
        !db ||
        !navigator.onLine
    ) {

        if (!hasLocalData) {

            statusElement.textContent =
                "Connect to the internet once to load the Post-its.";

        }

        return;

    }


    /*
       Internet available.
    */

    try {

        await syncFromSupabase();

    } catch (error) {

        console.error(
            "ONLINE SYNC ERROR:",
            error
        );


        if (!hasLocalData) {

            statusElement.textContent =
                "Could not load notes.";

        }

    }

}


/* =========================
   SYNC FROM SUPABASE
========================= */

async function syncFromSupabase() {

    /* =========================
       LOAD NOTES
    ========================= */

    const {
        data: notes,
        error: notesError
    } = await db
        .from("notes")
        .select("*")
        .eq("active", true)
        .order("id");


    if (notesError) {

        throw notesError;

    }


    /* =========================
       LOAD CATEGORIES
    ========================= */

    const {
        data: categoryData,
        error: categoryError
    } = await db
        .from("categories")
        .select(
            "id, name, color"
        )
        .order("id");


    if (categoryError) {

        throw categoryError;

    }


    /*
       Update note/category data.
    */

    allNotes =
        notes || [];


    categories =
        categoryData || [];


    /*
       First upload any pending
       offline actions.
    */

    await syncPendingChanges();


    /*
       Now get the authoritative
       collection state from Supabase.
    */

    const {
        data: collections,
        error: collectionsError
    } = await db
        .from("collections")
        .select("note_id")
        .order("collected_at");


    if (collectionsError) {

        throw collectionsError;

    }


    const collectedIds =
        collections.map(
            item =>
                item.note_id
        );


    availableNotes =
        allNotes.filter(
            note =>
                !collectedIds.includes(
                    note.id
                )
        );


    collectedNotes =
        allNotes.filter(
            note =>
                collectedIds.includes(
                    note.id
                )
        );


    saveLocalGame();


    updateInterface();


    if (
        availableNotes.length === 0
    ) {

        statusElement.textContent =
            "You've collected every Post-it!";

    } else {

        statusElement.textContent =
            "Tap the jar to draw a Post-it.";

    }

}


/* =========================
   SYNC PENDING CHANGES
========================= */

async function syncPendingChanges() {

    /*
       RESET
    */

    if (isResetPending()) {

        const {
            error
        } = await db
            .from("collections")
            .delete()
            .not(
                "note_id",
                "is",
                null
            );


        if (error) {

            throw error;

        }


        setResetPending(
            false
        );


        /*
           A reset means any
           pending collection inserts
           are no longer relevant.
        */

        savePendingCollections(
            []
        );

    }


    /*
       OFFLINE COLLECTIONS
    */

    const pendingIds =
        getPendingCollections();


    if (
        pendingIds.length === 0
    ) {

        return;

    }


    for (
        const noteId of pendingIds
    ) {

        const {
            error
        } = await db
            .from("collections")
            .insert({
                note_id:
                    noteId
            });


        /*
           If this fails, stop here.
           The remaining IDs stay cached
           and will be retried later.
        */

        if (error) {

            console.error(
                "PENDING COLLECTION ERROR:",
                error
            );

            throw error;

        }

    }


    savePendingCollections(
        []
    );

}


/* =========================
   DRAW NOTE
========================= */

async function drawNote() {

    if (
        availableNotes.length === 0
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


    await wait(
        700
    );


    jarElement.classList.remove(
        "shaking"
    );


    jarElement.classList.add(
        "lid-open"
    );


    await wait(
        500
    );


    const randomIndex =
        Math.floor(
            Math.random() *
            availableNotes.length
        );


    const note =
        availableNotes[
            randomIndex
        ];


    /*
       Update LOCAL state first.
    */

    availableNotes.splice(
        randomIndex,
        1
    );


    collectedNotes.push(
        note
    );


    saveCollectedIds();


    updateInterface();


    /*
       If online, save immediately.
       Otherwise put the action in
       the pending queue.
    */

    if (
        db &&
        navigator.onLine
    ) {

        try {

            const {
                error
            } = await db
                .from("collections")
                .insert({
                    note_id:
                        note.id
                });


            if (error) {

                console.error(
                    "ONLINE COLLECTION ERROR:",
                    error
                );


                const pending =
                    getPendingCollections();


                if (
                    !pending.includes(
                        note.id
                    )
                ) {

                    pending.push(
                        note.id
                    );

                    savePendingCollections(
                        pending
                    );

                }

            }

        } catch (error) {

            console.error(
                "ONLINE COLLECTION ERROR:",
                error
            );


            const pending =
                getPendingCollections();


            if (
                !pending.includes(
                    note.id
                )
            ) {

                pending.push(
                    note.id
                );

                savePendingCollections(
                    pending
                );

            }

        }

    } else {

        const pending =
            getPendingCollections();


        if (
            !pending.includes(
                note.id
            )
        ) {

            pending.push(
                note.id
            );

            savePendingCollections(
                pending
            );

        }

    }


    await wait(
        300
    );


    showNote(
        note
    );

}


/* =========================
   GET CATEGORY COLOR
========================= */

function getCategoryColor(
    categoryName
) {

    const category =
        categories.find(
            item =>
                item.name ===
                categoryName
        );


    if (!category) {

        console.warn(
            "No category color found for:",
            categoryName
        );

        return "white";

    }


    return category.color;

}


/* =========================
   SHOW NOTE
========================= */

function showNote(
    note
) {

    noteCategory.textContent =
        formatCategory(
            note.category
        );


    noteText.textContent =
        note.text;


    const categoryColor =
        getCategoryColor(
            note.category
        );


    bigNote.className =
        `big-note ${convertColor(
            categoryColor
        )}`;


    modal.classList.add(
        "visible"
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


        if (
            availableNotes.length === 0
        ) {

            statusElement.textContent =
                "You've collected every Post-it!";

        } else {

            statusElement.textContent =
                "Tap the jar to draw another Post-it.";

        }

    }
);


/* =========================
   JAR CLICK
========================= */

jarElement.addEventListener(
    "click",
    () => {

        if (
            availableNotes.length > 0
        ) {

            drawNote();

        }

    }
);


/* =========================
   UPDATE INTERFACE
========================= */

function updateInterface() {

    remainingElement.textContent =
        availableNotes.length;


    collectedElement.textContent =
        collectedNotes.length;


    renderJar();

}


/* =========================
   RENDER JAR
========================= */

function renderJar() {

    jarNotesElement.innerHTML =
        "";


    if (
        availableNotes.length === 0
    ) {

        return;

    }


    const amount =
        Math.min(
            availableNotes.length,
            70
        );


    for (
        let i = 0;
        i < amount;
        i++
    ) {

        const note =
            document.createElement(
                "div"
            );


        const source =
            availableNotes[
                i %
                availableNotes.length
            ];


        const categoryColor =
            getCategoryColor(
                source.category
            );


        note.className =
            "mini-note " +
            convertColor(
                categoryColor
            );


        const left =
            random(
                2,
                92
            );


        const top =
            random(
                2,
                92
            );


        note.style.left =
            `${left}%`;


        note.style.top =
            `${top}%`;


        note.style.setProperty(
            "--rotation",
            `${random(-20,20)}deg`
        );


        jarNotesElement.appendChild(
            note
        );

    }

}


/* =========================
   COLLECTION BUTTON
========================= */

collectionButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "collection.html";

    }
);


/* =========================
   RESET JAR
========================= */

resetButton.addEventListener(
    "click",
    async () => {

        const confirmed =
            window.confirm(
                "Are you sure you want to reset the jar?\n\nAll collected Post-its will be returned to the jar."
            );


        if (!confirmed) {

            return;

        }


        resetButton.disabled =
            true;


        setResetButtonText(
            "Resetting..."
        );


        statusElement.textContent =
            "Resetting jar...";


        /*
           RESET LOCAL STATE FIRST.
        */

        availableNotes =
            [...allNotes];


        collectedNotes =
            [];


        saveCollectedIds();


        /*
           Mark reset as pending.
           This is important if we are offline.
        */

        setResetPending(
            true
        );


        /*
           Clear pending individual
           collection uploads because
           the reset supersedes them.
        */

        savePendingCollections(
            []
        );


        updateInterface();


        /*
           Try to reset Supabase.
        */

        if (
            db &&
            navigator.onLine
        ) {

            try {

                const {
                    error
                } = await db
                    .from("collections")
                    .delete()
                    .not(
                        "note_id",
                        "is",
                        null
                    );


                if (error) {

                    console.error(
                        "RESET ONLINE ERROR:",
                        error
                    );

                } else {

                    setResetPending(
                        false
                    );

                }

            } catch (error) {

                console.error(
                    "RESET ONLINE ERROR:",
                    error
                );

            }

        }


        resetButton.disabled =
            false;


        setResetButtonText(
            "Reset Jar"
        );


        statusElement.textContent =
            "Jar has been reset! Tap the jar to draw a Post-it.";

    }
);


/* =========================
   ONLINE / OFFLINE
========================= */

window.addEventListener(
    "online",
    async () => {

        console.log(
            "Internet connection restored."
        );


        statusElement.textContent =
            "Connection restored. Syncing...";


        try {

            await syncFromSupabase();

        } catch (error) {

            console.error(
                "SYNC ERROR:",
                error
            );


            statusElement.textContent =
                "Could not sync. Your local game is still safe.";

        }

    }
);


window.addEventListener(
    "offline",
    () => {

        console.log(
            "Offline mode."
        );


        statusElement.textContent =
            "Offline mode — your collection is saved locally.";

    }
);


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
   FORMAT CATEGORY
========================= */

function formatCategory(
    category
) {

    if (!category) {

        return "Surprise";

    }


    return category
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /\b\w/g,
            letter =>
                letter.toUpperCase()
        );

}


/* =========================
   START
========================= */

loadGame();