const SUPABASE_URL =
    "https://vaqmavrjvjktqijlpxst.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_1VBFWiNkHPz5XmLHP_v8KA_iJHKwrCg";


/* =========================
   AUTHENTICATION
========================= */

async function requireLogin() {

    if (!db) {

        window.location.href =
            "login.html";

        return false;

    }


    const {
        data,
        error
    } = await db.auth.getSession();


    if (error) {

        console.error(
            "AUTH SESSION ERROR:",
            error
        );

    }


    /*
       Supabase keeps the session
       locally, so this also works
       when the device is offline.
    */

    if (
        data &&
        data.session
    ) {

        return true;

    }


    /*
       No locally stored session.
       The player needs to log in.
    */

    window.location.href =
        "login.html";

    return false;

}


/* =========================
   CURRENT USER
========================= */

let currentUser = null;


async function loadCurrentUser() {

    const {
        data,
        error
    } = await db.auth.getSession();


    if (error) {

        console.error(
            "USER SESSION ERROR:",
            error
        );

        return false;

    }


    if (
        !data ||
        !data.session ||
        !data.session.user
    ) {

        console.error(
            "No authenticated user found."
        );

        return false;

    }


    currentUser =
        data.session.user;


    return true;

}


/* =========================
   LOCAL STORAGE
========================= */

const NOTES_CACHE_KEY =
    "postit_notes_cache";

const CATEGORIES_CACHE_KEY =
    "postit_categories_cache";

const IMAGE_CACHE_NAME =
    "postit-image-cache-v1";

/*
   Collection data is stored
   separately for each user.
*/

function getCollectionCacheKey() {

    if (!currentUser) {

        return null;

    }


    return (
        "postit_collection_cache_" +
        currentUser.id
    );

}


function getPendingCollectionsKey() {

    if (!currentUser) {

        return null;

    }


    return (
        "postit_pending_collections_" +
        currentUser.id
    );

}


function getPendingResetKey() {

    if (!currentUser) {

        return null;

    }


    return (
        "postit_pending_reset_" +
        currentUser.id
    );

}


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

function setResetButtonText(text) {

    const textElement =
        document.getElementById(
            "resetButtonText"
        );

    if (textElement) {

        textElement.textContent =
            text;

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
   IMAGE CACHE
========================= */

async function cacheNoteImage(
    imagePath
) {

    if (
        !imagePath ||
        !db ||
        !navigator.onLine
    ) {

        return null;

    }


    try {

        const {
            data,
            error
        } =
            await db.storage
                .from("postit-images")
                .createSignedUrl(
                    imagePath,
                    60 * 60
                );


        if (
            error ||
            !data ||
            !data.signedUrl
        ) {

            console.error(
                "IMAGE SIGNED URL ERROR:",
                error
            );

            return null;

        }


        const response =
            await fetch(
                data.signedUrl
            );


        if (
            !response.ok
        ) {

            console.error(
                "IMAGE DOWNLOAD ERROR:",
                response.status
            );

            return null;

        }


        const cache =
            await caches.open(
                IMAGE_CACHE_NAME
            );


        await cache.put(
            imagePath,
            response.clone()
        );


        return imagePath;

    } catch (error) {

        console.error(
            "IMAGE CACHE ERROR:",
            error
        );

        return null;

    }

}


async function getCachedNoteImage(
    imagePath
) {

    if (!imagePath) {

        return null;

    }


    try {

        const cache =
            await caches.open(
                IMAGE_CACHE_NAME
            );


        const response =
            await cache.match(
                imagePath
            );


        if (!response) {

            return null;

        }


        return URL.createObjectURL(
            await response.blob()
        );

    } catch (error) {

        console.error(
            "CACHED IMAGE ERROR:",
            error
        );

        return null;

    }

}

/* =========================
   OG JAR PHOTO
========================= */

const OG_JAR_IMAGE =
    "OG_JAR.jpeg";


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


async function cacheOGJarImage() {

    if (
        !db ||
        !navigator.onLine
    ) {

        return null;

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
                "OG IMAGE SIGNED URL ERROR:",
                error
            );

            return null;

        }


        const response =
            await fetch(
                data.signedUrl
            );


        if (
            !response.ok
        ) {

            console.error(
                "OG IMAGE DOWNLOAD ERROR:",
                response.status
            );

            return null;

        }


        const cache =
            await caches.open(
                IMAGE_CACHE_NAME
            );


        await cache.put(
            OG_JAR_IMAGE,
            response.clone()
        );


        return true;

    } catch (error) {

        console.error(
            "OG IMAGE CACHE ERROR:",
            error
        );

        return null;

    }

}


async function getCachedOGJarImage() {

    try {

        const cache =
            await caches.open(
                IMAGE_CACHE_NAME
            );


        const response =
            await cache.match(
                OG_JAR_IMAGE
            );


        if (!response) {

            return null;

        }


        return URL.createObjectURL(
            await response.blob()
        );

    } catch (error) {

        console.error(
            "OG CACHED IMAGE ERROR:",
            error
        );

        return null;

    }

}


async function showOGJar() {

    let imageUrl =
        await getCachedOGJarImage();


    /*
       If the image isn't cached,
       download it from Supabase.
    */

    if (
        !imageUrl &&
        navigator.onLine
    ) {

        const cached =
            await cacheOGJarImage();


        if (cached) {

            imageUrl =
                await getCachedOGJarImage();

        }

    }


    if (!imageUrl) {

        console.error(
            "OG jar image is not available."
        );

        return;

    }


    ogImage.src =
        imageUrl;


    ogOverlay.classList.add(
        "visible"
    );

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
   PENDING ACTIONS
========================= */

function getPendingCollections() {

    const key =
        getPendingCollectionsKey();


    if (!key) {

        return [];

    }


    return loadCache(
        key,
        []
    );

}


function savePendingCollections(
    ids
) {

    const key =
        getPendingCollectionsKey();


    if (!key) {

        return;

    }


    saveCache(
        key,
        ids
    );

}


function isResetPending() {

    const key =
        getPendingResetKey();


    if (!key) {

        return false;

    }


    return loadCache(
        key,
        false
    ) === true;

}


function setResetPending(
    value
) {

    const key =
        getPendingResetKey();


    if (!key) {

        return;

    }


    saveCache(
        key,
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


    const collectionKey =
        getCollectionCacheKey();


    if (collectionKey) {

        saveCache(
            collectionKey,
            collectedNotes.map(
                note =>
                    note.id
            )
        );

    }

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


    const collectionKey =
        getCollectionCacheKey();


    const collectedIds =
        collectionKey
            ? loadCache(
                collectionKey,
                []
            )
            : [];


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

    const collectionKey =
        getCollectionCacheKey();


    if (collectionKey) {

        saveCache(
            collectionKey,
            collectedNotes.map(
                note =>
                    note.id
            )
        );

    }

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

statusElement.innerHTML =
    availableNotes.length === 0
        ? `You've collected every Post-it! <img src="./icons/your-hearts-draw-post-it.png" class="status-emoji" alt=""> `
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

    console.log(
        "NOTES LOADED:",
        notes
    );

    console.log(
        "NUMBER OF NOTES:",
        notes ? notes.length : "null"
    );

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
        .eq(
            "user_id",
            currentUser.id
        )
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

        statusElement.innerHTML =
        `<You've collected every Post-it! img src="./icons/hearts-draw-post-it.png" class="status-emoji" alt="">`;

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
            .eq(
                "user_id",
                currentUser.id
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
                    noteId,

                user_id:
                    currentUser.id
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
                        note.id,

                    user_id:
                        currentUser.id
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

async function showNote(
    note
) {

    noteCategory.textContent =
        note.category;


    /*
       Always start with the
       normal text hidden/shown
       according to the note type.
    */

    noteText.innerHTML =
        note.text || "";


    const categoryColor =
        getCategoryColor(
            note.category
        );


    bigNote.className =
        `big-note ${convertColor(
            categoryColor
        )}`;


    /*
       IMAGE NOTE
    */

    if (
        note.image_url
    ) {

        /*
           First try the local cache.
        */

        let imageUrl =
            await getCachedNoteImage(
                note.image_url
            );


        /*
           If online and the image
           isn't cached yet, download it.
        */

        if (
            !imageUrl &&
            navigator.onLine
        ) {

            await cacheNoteImage(
                note.image_url
            );


            imageUrl =
                await getCachedNoteImage(
                    note.image_url
                );

        }


        if (imageUrl) {

            noteText.innerHTML =
                "";


            const image =
                document.createElement(
                    "img"
                );


            image.src =
                imageUrl;


            image.className =
                "note-image";


            image.alt =
                "Post-it image";


            noteText.appendChild(
                image
            );

        }

    }


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

        statusElement.innerHTML =
        `<You've collected every Post-it! img src="./icons/hearts-draw-post-it.png" class="status-emoji" alt="">`;

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

        sessionStorage.setItem(
            "collection_from_game",
            "true"
        );

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
                    .eq(
                        "user_id",
                        currentUser.id
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
   PIN SESSION
========================= */

const PIN_SESSION_KEY =
    "postit_pin_last_activity";

const PIN_TIMEOUT =
    15 * 60 * 1000; // 15 minutes


function updatePinActivity() {

    localStorage.setItem(
        PIN_SESSION_KEY,
        Date.now().toString()
    );

}


function isPinSessionActive() {

    const lastActivity =
        Number(
            localStorage.getItem(
                PIN_SESSION_KEY
            )
        );


    if (!lastActivity) {

        return false;

    }


    const elapsed =
        Date.now() - lastActivity;


    console.log(
        "PIN SESSION:",
        {
            lastActivity,
            elapsed,
            timeout: PIN_TIMEOUT,
            active:
                elapsed < PIN_TIMEOUT
        }
    );


    return elapsed <
        PIN_TIMEOUT;

}

/* =========================
   PIN ACTIVITY
========================= */

document.addEventListener(
    "click",
    updatePinActivity
);

document.addEventListener(
    "touchstart",
    updatePinActivity
);

document.addEventListener(
    "keydown",
    updatePinActivity
);

/* =========================
   START
========================= */

async function startApp() {

    const loggedIn =
        await requireLogin();


    if (!loggedIn) {

        return;

    }


    const userLoaded =
        await loadCurrentUser();


    if (!userLoaded) {

        window.location.href =
            "login.html";

        return;

    }


    /*
   PIN session lasts 15 minutes
   from the last activity.
    */

    if (!isPinSessionActive()) {

        window.location.href =
            "pin.html";

        return;

    }


    updatePinActivity();

        loadGame();

    }

startApp();