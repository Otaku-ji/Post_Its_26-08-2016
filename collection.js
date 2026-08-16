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

let collectedNotes = [];

let categories = [];

let selectedCategory =
    "ALL";


/* =========================
   ELEMENTS
========================= */

const collectionGrid =
    document.getElementById(
        "collectionGrid"
    );

const categoryButtons =
    document.getElementById(
        "categoryButtons"
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


/* =========================
   LOCAL CACHE
========================= */

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
            "Could not load cache:",
            error
        );

        return fallback;

    }

}


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
            "Could not save cache:",
            error
        );

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
   LOAD LOCAL COLLECTION
========================= */

function loadLocalCollection() {

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
   LOAD COLLECTION
========================= */

async function loadCollection() {

    console.log(
        "Loading collection..."
    );


    /*
       First load the locally
       cached game data.
    */

    const hasLocalData =
        loadLocalCollection();


    if (hasLocalData) {

        renderCategories();

        renderCollection();

    }


    /*
       No Supabase or no internet:
       stay completely offline.
    */

    if (
        !db ||
        !navigator.onLine
    ) {

        if (!hasLocalData) {

            collectionGrid.innerHTML =
                "<p>Connect to the internet once to load your collection.</p>";

        }

        return;

    }


    /*
       Internet is available.
       Refresh from Supabase and
       upload any pending actions.
    */

    try {

        await syncFromSupabase();

    } catch (error) {

        console.error(
            "ONLINE SYNC ERROR:",
            error
        );


        /*
           Local data remains visible
           if the online request fails.
        */

        if (!hasLocalData) {

            collectionGrid.innerHTML =
                "<p>Could not load your collection.</p>";

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


    /* =========================
       UPDATE NOTE DATA
========================= */

    allNotes =
        notes || [];


    categories =
        categoryData || [];


    /* =========================
       SYNC PENDING ACTIONS
========================= */

    await syncPendingChanges();


    /* =========================
       LOAD AUTHORITATIVE
       COLLECTION STATE
    ========================= */

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


    /* =========================
       UPDATE LOCAL STATE
========================= */

    collectedNotes =
        allNotes.filter(
            note =>
                collectedIds.includes(
                    note.id
                )
        );


    /* =========================
       SAVE ONLINE STATE LOCALLY
    ========================= */

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
        collectedIds
    );


    /* =========================
       UPDATE DISPLAY
    ========================= */

    renderCategories();

    renderCollection();

}


/* =========================
   SYNC PENDING CHANGES
========================= */

async function syncPendingChanges() {

    /* =========================
       PENDING RESET
    ========================= */

    if (isResetPending()) {

        console.log(
            "Pending reset found. Resetting Supabase collection..."
        );


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


        /*
           Reset succeeded.
        */

        setResetPending(
            false
        );


        /*
           Any pending collection
           inserts are superseded
           by the reset.
        */

        savePendingCollections(
            []
        );

    }


    /* =========================
       PENDING COLLECTIONS
    ========================= */

    const pendingIds =
        getPendingCollections();


    if (
        pendingIds.length === 0
    ) {

        return;

    }


    console.log(
        "Syncing pending collections:",
        pendingIds
    );


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
           If one upload fails,
           keep the entire remaining
           queue for the next attempt.
        */

        if (error) {

            console.error(
                "PENDING COLLECTION ERROR:",
                error
            );

            throw error;

        }

    }


    /*
       Everything was successfully
       uploaded.
    */

    savePendingCollections(
        []
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

        return "white";

    }


    return category.color;

}


/* =========================
   CATEGORIES
========================= */

function renderCategories() {

    categoryButtons.innerHTML =
        "";


    /* =========================
       ALL BUTTON
    ========================= */

    const allButton =
        document.createElement(
            "button"
        );


    allButton.textContent =
        "All";


    allButton.className =
        "category-button all-button";


    if (
        selectedCategory ===
        "ALL"
    ) {

        allButton.classList.add(
            "active"
        );

    }


    allButton.addEventListener(
        "click",
        () => {

            selectedCategory =
                "ALL";

            renderCategories();

            renderCollection();

        }
    );


    categoryButtons.appendChild(
        allButton
    );


    /* =========================
       CATEGORY BUTTONS
    ========================= */

    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.textContent =
                formatCategory(
                    category.name
                );


            button.className =
                "category-button " +
                convertColor(
                    category.color
                );


            if (
                selectedCategory ===
                category.name
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    selectedCategory =
                        category.name;

                    renderCategories();

                    renderCollection();

                }
            );


            categoryButtons.appendChild(
                button
            );

        }
    );

}


/* =========================
   COLLECTION
========================= */

function renderCollection() {

    collectionGrid.innerHTML =
        "";


    const filteredNotes =
        selectedCategory ===
        "ALL"

            ? collectedNotes

            : collectedNotes.filter(
                note =>
                    note.category ===
                    selectedCategory
            );


    if (
        filteredNotes.length === 0
    ) {

        collectionGrid.innerHTML =
            "<p>No Post-its collected yet.</p>";

        return;

    }


    filteredNotes.forEach(
        note => {

            const card =
                document.createElement(
                    "div"
                );


            const noteColor =
                getCategoryColor(
                    note.category
                );


            card.className =
                "collection-note " +
                convertColor(
                    noteColor
                );


            card.style.setProperty(
                "--rotation",
                `${random(-3,3)}deg`
            );


            /* =========================
               CATEGORY
            ========================= */

            const category =
                document.createElement(
                    "div"
                );


            category.className =
                "note-category";


            category.textContent =
                formatCategory(
                    note.category
                );


            /* =========================
               MESSAGE
            ========================= */

            const message =
                document.createElement(
                    "div"
                );


            message.className =
                "note-message";


            message.textContent =
                note.text;


            card.appendChild(
                category
            );


            card.appendChild(
                message
            );


            /* =========================
               OPEN NOTE
            ========================= */

            card.addEventListener(
                "click",
                () => {

                    showNote(
                        note
                    );

                }
            );


            collectionGrid.appendChild(
                card
            );

        }
    );

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


    const noteColor =
        getCategoryColor(
            note.category
        );


    bigNote.className =
        `big-note ${convertColor(
            noteColor
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

    }
);


/* =========================
   BACK TO JAR
========================= */

const backToJarButton =
    document.getElementById(
        "backToJarButton"
    );


backToJarButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "index.html";

    }
);


/* =========================
   ONLINE
========================= */

window.addEventListener(
    "online",
    async () => {

        console.log(
            "Internet connection restored."
        );


        try {

            await syncFromSupabase();

        } catch (error) {

            console.error(
                "SYNC ERROR:",
                error
            );

        }

    }
);


/* =========================
   OFFLINE
========================= */

window.addEventListener(
    "offline",
    () => {

        console.log(
            "Offline mode."
        );

    }
);


/* =========================
   HELPERS
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


function random(
    min,
    max
) {

    return Math.random() *
        (max - min) +
        min;

}


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

loadCollection();