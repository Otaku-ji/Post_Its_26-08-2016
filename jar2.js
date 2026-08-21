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
   IMAGE CACHE
========================= */
const IMAGE_CACHE_NAME ="postit-image-cache-v1";

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
                "JAR 2 IMAGE SIGNED URL ERROR:",
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
                "JAR 2 IMAGE DOWNLOAD ERROR:",
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
            "JAR 2 IMAGE CACHE ERROR:",
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
            "JAR 2 CACHED IMAGE ERROR:",
            error
        );

        return null;

    }

}

/* =========================
   CACHE ALL JAR 2 IMAGES
========================= */

async function cacheAllJar2Images() {

    if (
        !navigator.onLine ||
        !allJar2Notes ||
        allJar2Notes.length === 0
    ) {

        return;

    }


    const imageNotes =
        allJar2Notes.filter(
            note =>
                note.image_url
        );


    if (
        imageNotes.length === 0
    ) {

        return;

    }


    console.log(
        `JAR 2: Caching ${imageNotes.length} images...`
    );


    for (
        const note of imageNotes
    ) {

        try {

            await cacheNoteImage(
                note.image_url
            );

        } catch (error) {

            console.error(
                "JAR 2 IMAGE CACHE ERROR:",
                note.image_url,
                error
            );

        }

    }


    console.log(
        "JAR 2: All available images cached."
    );

}
 
/* =========================
   GAME DATA
========================= */

let allJar2Notes = [];
let availableJar2Notes = [];
let collectedJar2Notes = [];
let jar2Categories = [];
let availableDailyDraws = 0;

let currentUser = null;

const JAR2_START_DATE = "2026-08-19";


/* =========================
   LOCAL CACHE
========================= */

const JAR2_NOTES_CACHE_KEY =
    "jar2_notes_cache";

const JAR2_CATEGORIES_CACHE_KEY =
    "jar2_categories_cache";


function getJar2CollectionCacheKey() {

    if (!currentUser) {

        return null;

    }

    return (
        "jar2_collection_cache_" +
        currentUser.id
    );

}


function getJar2PendingCollectionsKey() {

    if (!currentUser) {

        return null;

    }

    return (
        "jar2_pending_collections_" +
        currentUser.id
    );

}


function getJar2PendingResetKey() {

    if (!currentUser) {

        return null;

    }

    return (
        "jar2_pending_reset_" +
        currentUser.id
    );

}


/* =========================
   CACHE HELPERS
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
            "JAR 2 CACHE SAVE ERROR:",
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
            "JAR 2 CACHE LOAD ERROR:",
            error
        );

        return fallback;

    }

}

/* =========================
   JAR 2 PENDING ACTIONS
========================= */

function getPendingJar2Collections() {

    const key =
        getJar2PendingCollectionsKey();

    if (!key) {

        return [];

    }

    return loadCache(
        key,
        []
    );

}


function savePendingJar2Collections(
    collections
) {

    const key =
        getJar2PendingCollectionsKey();

    if (!key) {

        return;

    }

    saveCache(
        key,
        collections
    );

}


function isJar2ResetPending() {

    const key =
        getJar2PendingResetKey();

    if (!key) {

        return false;

    }

    return loadCache(
        key,
        false
    ) === true;

}


function setJar2ResetPending(
    value
) {

    const key =
        getJar2PendingResetKey();

    if (!key) {

        return;

    }

    saveCache(
        key,
        value
    );

}

/* =========================
   ELEMENTS
========================= */



const remainingElement =
    document.getElementById(
        "jar2Remaining"
    );


const collectedElement =
    document.getElementById(
        "jar2Collected"
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

async function cacheOGJarImage() {

    if (
        !navigator.onLine ||
        !db
    ) {

        return false;

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
                "OG JAR CACHE SIGNED URL ERROR:",
                error
            );

            return false;

        }


        const response =
            await fetch(
                data.signedUrl
            );


        if (
            !response.ok
        ) {

            console.error(
                "OG JAR CACHE DOWNLOAD ERROR:",
                response.status
            );

            return false;

        }


        const cache =
            await caches.open(
                IMAGE_CACHE_NAME
            );


        await cache.put(
            OG_JAR_IMAGE,
            response.clone()
        );


        console.log(
            "OG JAR IMAGE CACHED."
        );


        return true;

    } catch (error) {

        console.error(
            "OG JAR IMAGE CACHE ERROR:",
            error
        );

        return false;

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
            "OG JAR CACHED IMAGE ERROR:",
            error
        );

        return null;

    }

}

async function showOGJar() {

    /*
       First try the local cache.
    */

    let imageUrl =
        await getCachedOGJarImage();


    /*
       If it isn't cached and we're online,
       download it now.
    */

    if (
        !imageUrl &&
        navigator.onLine
    ) {

        await cacheOGJarImage();


        imageUrl =
            await getCachedOGJarImage();

    }


    /*
       Show cached image.
    */

    if (imageUrl) {

        ogImage.src =
            imageUrl;


        ogImage.onload =
            () => {

                ogOverlay.classList.add(
                    "visible"
                );

            };


        return;

    }


    /*
       Nothing available.
    */

    console.error(
        "OG JAR IMAGE IS NOT AVAILABLE."
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
   DAILY DRAW SYSTEM
========================= */

function getTodayDate() {

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );

    return today;

}


function getJar2AvailableDraws(
    totalCollected
) {

    const startDate =
        new Date(
            JAR2_START_DATE + "T00:00:00"
        );

    const today =
        getTodayDate();


    /*
       Jar 2 has not started yet.
    */

    if (
        today < startDate
    ) {

        return 0;

    }


    /*
       Calculate number of
       calendar days since start.
       
       +1 means the start date
       itself counts as a draw day.
    */

    const millisecondsPerDay =
        1000 *
        60 *
        60 *
        24;


    const elapsedDays =
        Math.floor(
            (
                today.getTime() -
                startDate.getTime()
            ) /
            millisecondsPerDay
        );


    const earnedDraws =
        elapsedDays + 1;


    /*
       Every collected Post-it
       consumes one earned draw.
    */

    const availableDraws =
        earnedDraws -
        totalCollected;


    return Math.max(
        0,
        availableDraws
    );

}

/* =========================
   SAVE JAR 2 LOCAL GAME
========================= */

function saveJar2LocalGame() {

    saveCache(
        JAR2_NOTES_CACHE_KEY,
        allJar2Notes
    );


    saveCache(
        JAR2_CATEGORIES_CACHE_KEY,
        jar2Categories
    );


    const collectionKey =
        getJar2CollectionCacheKey();


    if (collectionKey) {

        saveCache(
            collectionKey,
            collectedJar2Notes.map(
                note => ({
                    note_id:
                        note.id,

                    drawn_at:
                        note.drawn_at || null
                })
            )
        );

    }

}


/* =========================
   LOAD JAR 2 LOCAL GAME
========================= */

function loadJar2LocalGame() {

    allJar2Notes =
        loadCache(
            JAR2_NOTES_CACHE_KEY,
            []
        );


    jar2Categories =
        loadCache(
            JAR2_CATEGORIES_CACHE_KEY,
            []
        );


    const collectionKey =
        getJar2CollectionCacheKey();


    const cachedCollection =
        collectionKey
            ? loadCache(
                collectionKey,
                []
            )
            : [];


    const collectedIds =
        cachedCollection.map(
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
                        cachedCollection.find(
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


    return (
        allJar2Notes.length > 0 &&
        jar2Categories.length > 0
    );

}
/* =========================
   SYNC PENDING JAR 2 CHANGES
========================= */

/* =========================
   SYNC PENDING JAR 2 CHANGES
========================= */

async function syncPendingJar2Changes() {

    /*
       ========================================
       RESET
       ========================================
    */

    if (
        isJar2ResetPending()
    ) {

        console.log(
            "JAR 2: Pending reset found. Synchronizing..."
        );


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

            console.error(
                "PENDING JAR 2 RESET ERROR:",
                error
            );

            throw error;

        }


        /*
           Reset successfully reached
           Supabase.
        */

        setJar2ResetPending(
            false
        );


        /*
           Any draws that existed before
           the reset are no longer relevant.
        */

        savePendingJar2Collections(
            []
        );


        console.log(
            "JAR 2: Pending reset synchronized."
        );

    }


    /*
       ========================================
       PENDING COLLECTIONS
       ========================================
    */

    let pending =
        getPendingJar2Collections();


    if (
        pending.length === 0
    ) {

        return;

    }


    console.log(
        `JAR 2: Synchronizing ${pending.length} pending draw(s)...`
    );


    /*
       Process one pending draw at a time.
    */

    while (
        pending.length > 0
    ) {

        const item =
            pending[0];


        try {

            const {
                error
            } = await db
                .from("jar2_collections")
                .insert({

                    note_id:
                        item.note_id,

                    user_id:
                        currentUser.id,

                    drawn_at:
                        item.drawn_at

                });


            /*
               Upload failed.

               Keep this item in local storage
               and stop. It will be retried
               the next time we reconnect.
            */

            if (error) {

                console.error(
                    "PENDING JAR 2 COLLECTION ERROR:",
                    error
                );

                throw error;

            }


            /*
               Upload succeeded.

               Remove ONLY this successfully
               synchronized item from the queue.
            */

            pending.shift();


            savePendingJar2Collections(
                pending
            );


            console.log(
                "JAR 2: Pending draw synchronized:",
                item.note_id
            );

        } catch (error) {

            /*
               IMPORTANT:

               The current item remains in
               local storage because we only
               remove it after a successful
               Supabase insert.
            */

            console.error(
                "JAR 2: Pending synchronization stopped.",
                error
            );

            throw error;

        }

    }


    console.log(
        "JAR 2: All pending changes synchronized."
    );

}

/* =========================
   LOAD NOTES
========================= */

async function loadJar2() {

    statusElement.textContent =
        "Loading jar...";

    /*
   First load locally cached data.
*/

    const hasLocalData =
        loadJar2LocalGame();


    if (hasLocalData) {

        availableDailyDraws =
            getJar2AvailableDraws(
                collectedJar2Notes.length
            );


        updateInterface();


        statusElement.textContent =
            availableJar2Notes.length === 0
                ? "You've collected every Post-it!"
                : availableDailyDraws === 0
                    ? "No Post-it available today. Come back tomorrow!"
                    : "Tap the jar to draw a Post-it.";

    }

            /*
        No internet:
        continue using local data.
        */

        if (
            !navigator.onLine
        ) {

            if (!hasLocalData) {

                statusElement.textContent =
                    "Connect to the internet once to load the Special Jar.";

            }

            return;

}

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

     const {
            data: categoryData,
            error: categoryError
        } = await db
            .from("jar2_categories")
            .select(
                "id, name, color"
            )
            .order("id");


        if (categoryError) {

            throw categoryError;

        }


        jar2Categories =
            categoryData || [];

        allJar2Notes =
            notes || [];

        await cacheAllJar2Images();

        await cacheOGJarImage();

                    /*
        Upload any draws that were made
        while offline.
        */

        await syncPendingJar2Changes();

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

        availableDailyDraws =
            getJar2AvailableDraws(
                collectedJar2Notes.length
            );

        saveJar2LocalGame();


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
   ONLINE / OFFLINE
========================= */

window.addEventListener(
    "online",
    async () => {

        console.log(
            "Jar 2 internet connection restored."
        );


        statusElement.textContent =
            "Connection restored. Syncing...";


        try {

            /*
               Upload pending offline draws
               and refresh the authoritative
               Supabase collection.
            */

            await loadJar2();


        } catch (error) {

            console.error(
                "JAR 2 SYNC ERROR:",
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
            "Jar 2 offline mode."
        );


        statusElement.textContent =
            "Offline mode — your Special Jar is saved locally.";

    }
);

/* =========================
   UPDATE INTERFACE
========================= */

function updateInterface() {

    remainingElement.textContent =
        availableJar2Notes.length;

    if (collectedElement) {

        collectedElement.textContent =
            collectedJar2Notes.length;

    }

    renderJar();

}

/* =========================
   GET CATEGORY COLOR
========================= */

function getJar2CategoryColor(
    categoryName
) {

    const category =
        jar2Categories.find(
            item =>
                item.name ===
                categoryName
        );


    if (!category) {

        console.warn(
            "No Jar 2 category color found for:",
            categoryName
        );

        return "white";

    }


    return category.color;

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


            const categoryColor =
                getJar2CategoryColor(
                    source.category
                );


            note.className =
                "mini-note " +
                convertColor(
                    categoryColor
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
            "You've collected every Post-it!";

        return;

    }


    if (
        availableDailyDraws <= 0
    ) {

        statusElement.textContent =
            "No Post-it available today. Come back tomorrow!";

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
   UPDATE LOCAL STATE FIRST.

   The draw should work even when
   there is no internet connection.
*/

availableJar2Notes.splice(
    randomIndex,
    1
);


availableDailyDraws--;


collectedJar2Notes.push({

    ...note,

    drawn_at:
        drawnAt

});


/*
   Save the updated collection locally.
*/

saveJar2LocalGame();


/*
   If online, try to save immediately.
   Otherwise put the draw into the
   pending queue.
*/

if (
    db &&
    navigator.onLine
) {

    try {

        const {
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

            });


        if (error) {

            console.error(
                "JAR 2 ONLINE COLLECTION ERROR:",
                error
            );


            const pending =
                getPendingJar2Collections();


            pending.push({

                note_id:
                    note.id,

                drawn_at:
                    drawnAt

            });


            savePendingJar2Collections(
                pending
            );

        }

    } catch (error) {

        console.error(
            "JAR 2 ONLINE COLLECTION ERROR:",
            error
        );


        const pending =
            getPendingJar2Collections();


        pending.push({

            note_id:
                note.id,

            drawn_at:
                drawnAt

        });


        savePendingJar2Collections(
            pending
        );

    }

} else {

    const pending =
        getPendingJar2Collections();


    pending.push({

        note_id:
            note.id,

        drawn_at:
            drawnAt

    });


    savePendingJar2Collections(
        pending
    );

}


    updateInterface();


    await wait(300);


    showNote({
        ...note,

        drawn_at:
            drawnAt
    });

}


/* =========================
   SHOW NOTE
========================= */

async function showNote(note) {

    noteCategory.textContent =
        note.category || "";


    noteText.innerHTML =
        "";


        /*
       NOTE CONTENT
       
       Jar 2 notes can contain both
       text and an image.
    */

    if (
        note.text
    ) {

        const textElement =
            document.createElement(
                "div"
            );


        textElement.textContent =
            note.text;


        noteText.appendChild(
            textElement
        );

    }


    /*
       IMAGE
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
           If the image is not cached
           and we are online, download it.
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

        } else if (
            !navigator.onLine
        ) {

            const imageMessage =
                document.createElement(
                    "div"
                );


            imageMessage.textContent =
                "Image unavailable offline.";


            noteText.appendChild(
                imageMessage
            );

        }

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

    const categoryColor =
        getJar2CategoryColor(
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


        if (
            availableJar2Notes.length === 0
        ) {

            statusElement.textContent =
                "You've collected every Post-it!";

        } else if (
            availableDailyDraws === 0
        ) {

            statusElement.textContent =
                "No Post-it available today. Come back tomorrow!";

        } else {

            statusElement.textContent =
                availableDailyDraws === 1
                    ? "You have 1 Post-it to draw."
                    : `You have ${availableDailyDraws} Post-its to draw.`;

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


            statusElement.textContent =
                "Resetting jar...";


            /*
               RESET LOCAL STATE FIRST.

               This makes reset work even
               when the device is offline.
            */

            availableJar2Notes =
                [...allJar2Notes];


            collectedJar2Notes =
                [];


            availableDailyDraws =
                getJar2AvailableDraws(
                    0
                );


            /*
               Save the reset state locally.
            */

            saveJar2LocalGame();


            /*
               The reset supersedes all
               previously pending draws.
            */

            savePendingJar2Collections(
                []
            );


            /*
               Mark reset as pending.

               If the device is offline,
               this will be synchronized
               later.
            */

            setJar2ResetPending(
                true
            );


            updateInterface();


           /*
            Try to reset Supabase
            immediately if online.
            */

            let resetSynced =
                false;


            if (
                db &&
                navigator.onLine
            ) {

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

                        console.error(
                            "JAR 2 RESET ONLINE ERROR:",
                            error
                        );

                    } else {

                        /*
                        Supabase reset succeeded.
                        */

                        setJar2ResetPending(
                            false
                        );


                        resetSynced =
                            true;

                    }

                } catch (error) {

                    console.error(
                        "JAR 2 RESET ONLINE ERROR:",
                        error
                    );

                }

            }


            resetButton.disabled =
                false;


            resetButton.textContent =
                "Reset Jar";


            if (
                resetSynced
            ) {

                statusElement.textContent =
                    "Jar has been reset! Tap the jar to draw a Post-it.";

            } else if (
                navigator.onLine
            ) {

                statusElement.textContent =
                    "Jar reset locally. It will synchronize when possible.";

            } else {

                statusElement.textContent =
                    "Jar reset locally. It will synchronize when you reconnect.";

            }

        }
    );

}


/* =========================
   ONLINE / OFFLINE
========================= */

window.addEventListener(
    "online",
    async () => {

        console.log(
            "Jar 2: Internet connection restored."
        );


        statusElement.textContent =
            "Connection restored. Syncing...";


        try {

            await loadJar2();


            if (
                availableJar2Notes.length === 0
            ) {

                statusElement.textContent =
                    "You've collected every Post-it!";

            } else if (
                availableDailyDraws === 0
            ) {

                statusElement.textContent =
                    "No Post-it available today. Come back tomorrow!";

            } else {

                statusElement.textContent =
                    availableDailyDraws === 1
                        ? "You have 1 Post-it to draw."
                        : `You have ${availableDailyDraws} Post-its to draw.`;

            }


        } catch (error) {

            console.error(
                "JAR 2 ONLINE SYNC ERROR:",
                error
            );


            statusElement.textContent =
                "Could not sync. Your local game is still available.";

        }

    }
);


window.addEventListener(
    "offline",
    () => {

        console.log(
            "Jar 2: Offline mode."
        );


        statusElement.textContent =
            "Offline mode — your Jar 2 collection is saved locally.";

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
   PIN SESSION
========================= */

const PIN_SESSION_KEY =
    "postit_pin_last_activity";

const PIN_TIMEOUT =
    15 * 60 * 1000; // 15 minutes


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


    return (
        Date.now() - lastActivity <
        PIN_TIMEOUT
    );

}


function updatePinActivity() {

    if (!isPinSessionActive()) {

        return;

    }

    localStorage.setItem(
        PIN_SESSION_KEY,
        Date.now().toString()
    );

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

/* =========================
   START
========================= */

async function startJar2() {

    const loggedIn =
        await loadCurrentUser();


    if (!loggedIn) {

        return;

    }


    /*
       Require an active PIN session.
    */

    if (!isPinSessionActive()) {

        sessionStorage.setItem(
            "pin_return_url",
            "jar2.html"
        );


        window.location.href =
            "pin.html";

        return;

    }


    /*
       PIN session is active.
       Keep the 15-minute timer
       alive from the latest activity.
    */

    updatePinActivity();


    await loadJar2();

}


startJar2();