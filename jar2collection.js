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
   DATA
========================= */

let currentUser = null;

let allNotes = [];

let collectedNotes = [];

let activeCategory = "All";

let searchTerm = "";

const IMAGE_CACHE_NAME = "postit-image-cache-v1";

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
                "JAR 2 COLLECTION IMAGE SIGNED URL ERROR:",
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
                "JAR 2 COLLECTION IMAGE DOWNLOAD ERROR:",
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
            "JAR 2 COLLECTION IMAGE CACHE ERROR:",
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
            "JAR 2 COLLECTION CACHED IMAGE ERROR:",
        error
        );

        return null;

    }

}

/* =========================
   ELEMENTS
========================= */

const collectionGrid =
    document.getElementById(
        "jar2CollectionGrid"
    );

const categoryFilters =
    document.getElementById(
        "categoryButtons"
    );

const searchInput =
    document.getElementById(
        "jar2SearchInput"
    );

const emptyMessage =
    document.getElementById(
        "jar2EmptyMessage"
    );

const backButton =
    document.getElementById(
        "jar2BackButton"
    );


/* =========================
   MODAL
========================= */

const modal =
    document.getElementById(
        "jar2CollectionModal"
    );

const bigNote =
    document.getElementById(
        "jar2CollectionBigNote"
    );

const noteCategory =
    document.getElementById(
        "jar2CollectionNoteCategory"
    );

const noteText =
    document.getElementById(
        "jar2CollectionNoteText"
    );

const noteDate =
    document.getElementById(
        "jar2CollectionNoteDate"
    );


/* =========================
   AUTH
========================= */

async function loadCurrentUser() {

    const {
        data,
        error
    } = await db.auth.getSession();


    if (error) {

        console.error(
            "COLLECTION AUTH ERROR:",
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
   LOAD COLLECTION
========================= */

async function loadCollection() {

    try {

        /*
           Load all Jar 2 notes.
        */

       const {
        data: notes,
        error: notesError
    } = await db
        .from("jar2_notes")
        .select(`
            *,
            jar2_categories (
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


        allNotes =
            (notes || []).map(
                note => {

                    return {
                        ...note,

                        category:
                            note.jar2_categories?.name ||
                            note.category,

                        color:
                            note.jar2_categories?.color ||
                            "white"
                    };

                }
        );

        /*
           Load only this user's
           collected notes.
        */

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
                    ascending: false
                }
            );


        if (collectionsError) {

            throw collectionsError;

        }


        /*
           Match collection records
           with the actual notes.
        */

        collectedNotes =
            (collections || [])
                .map(
                    collection => {

                        const note =
                            allNotes.find(
                                item =>
                                    item.id ===
                                    collection.note_id
                            );


                        if (!note) {

                            return null;

                        }


                        return {

                            ...note,

                            drawn_at:
                                collection.drawn_at

                        };

                    }
                )
                .filter(
                    note =>
                        note !== null
                );



        renderCategoryFilters();

        renderCollection();


    } catch (error) {

        console.error(
            "COLLECTION LOAD ERROR:",
            error
        );


        emptyMessage.textContent =
            "Could not load your collection.";

        emptyMessage.style.display =
            "block";

    }

}


/* =========================
   CATEGORY FILTERS
========================= */

function renderCategoryFilters() {

    categoryFilters.innerHTML =
        "";


    /*
       Get unique categories
       from ALL Jar 2 notes.

       This means the category buttonsQ
       remain visible even when the
       collection is empty.
    */

    const categories =
        [
            ...new Set(
                allNotes
                    .map(
                        note =>
                            note.category
                    )
                    .filter(
                        category =>
                            category
                    )
            )
        ];


    /*
       ALL BUTTON
    */

    createCategoryButton(
        "All",
        "white"
    );


    /*
       CATEGORY BUTTONS
    */

    categories.forEach(
        category => {

            const note =
                allNotes.find(
                    item =>
                        item.category ===
                        category
                );


            createCategoryButton(
                category,
                note
                    ? note.color
                    : "white"
            );

        }
    );

}


/* =========================
   CREATE CATEGORY BUTTON
========================= */

function createCategoryButton(
    category,
    color
) {

    const button =
        document.createElement(
            "button"
        );


    button.type =
        "button";


    button.className =
        "category-button";


    if (
        category ===
        activeCategory
    ) {

        button.classList.add(
            "active"
        );

    }


    /*
       Apply category colour.
    */

    if (
        category !== "All"
    ) {

        button.classList.add(
            convertColor(
                color
            )
        );

    }


    button.textContent =
        formatCategory(
            category
        );


    button.addEventListener(
        "click",
        () => {

            activeCategory =
                category;

            renderCategoryFilters();

            renderCollection();

        }
    );


    categoryFilters.appendChild(
        button
    );

}


/* =========================
   SEARCH
========================= */

searchInput.addEventListener(
    "input",
    () => {

        searchTerm =
            searchInput.value
                .trim()
                .toLowerCase();


        renderCollection();

    }
);


/* =========================
   FILTER COLLECTION
========================= */

function getFilteredNotes() {

    return collectedNotes.filter(
        note => {

            /*
               CATEGORY
            */

            if (
                activeCategory !==
                "All" &&
                note.category !==
                activeCategory
            ) {

                return false;

            }


            /*
               SEARCH
            */

            if (
                searchTerm
            ) {

                const text =
                    (
                        note.text ||
                        ""
                    )
                    .toLowerCase();


                const category =
                    (
                        note.category ||
                        ""
                    )
                    .toLowerCase();


                if (
                    !text.includes(
                        searchTerm
                    ) &&
                    !category.includes(
                        searchTerm
                    )
                ) {

                    return false;

                }

            }


            return true;

        }
    );

}


/* =========================
   RENDER COLLECTION
========================= */

function renderCollection() {

    collectionGrid.innerHTML =
        "";


    const notes =
        getFilteredNotes();


    if (
        notes.length === 0
    ) {

        emptyMessage.style.display =
            "block";

        return;

    }


    emptyMessage.style.display =
        "none";


    notes.forEach(
        note => {

            createCollectionNote(
                note
            );

        }
    );

}


/* =========================
   CREATE COLLECTION NOTE
========================= */

async function createCollectionNote(
    note
) {

    const sticky =
        document.createElement(
            "div"
        );


    sticky.className =
        "collection-note " +
        convertColor(
            note.color
        );
    
    const rotation =
        Math.random() * 6 - 3;

    sticky.style.setProperty(
        "--rotation",
        `${rotation}deg`
    );

    /*
       Category title
    */

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "collection-note-title";


    title.textContent =
        formatCategory(
            note.category
        );


    sticky.appendChild(
        title
    );


    /*
       Content
    */

    if (
    note.image_url
) {

    /*
       First try local cache.
    */

    let imageUrl =
        await getCachedNoteImage(
            note.image_url
        );


    /*
       If not cached, download it
       while online.
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
            "collection-note-image";


        image.alt =
            "Post-it image";


        sticky.appendChild(
            image
        );

    } else if (!navigator.onLine) {

        const text =
            document.createElement(
                "div"
            );


        text.className =
            "collection-note-text";


        text.textContent =
            "Image unavailable offline.";


        sticky.appendChild(
            text
        );

    }

    } else {

        const text =
            document.createElement(
                "div"
            );


        text.className =
            "collection-note-text";


        text.textContent =
            note.text || "";


        sticky.appendChild(
            text
        );

    }


    /*
       DRAW DATE
    */

    const date =
        document.createElement(
            "div"
        );


    date.className =
        "collection-note-date";


    date.textContent =
        formatDrawDate(
            note.drawn_at
        );


    sticky.appendChild(
        date
    );


    /*
       OPEN NOTE
    */

    sticky.addEventListener(
        "click",
        () => {

            showNote(
                note
            );

        }
    );


    collectionGrid.appendChild(
        sticky
    );

}


/* =========================
   SHOW LARGE NOTE
========================= */

async function showNote(
    note
) {

    noteCategory.textContent =
        formatCategory(
            note.category
        );


    noteText.innerHTML =
        "";


    if (
    note.image_url
) {

    /*
       First try local cache.
    */

    let imageUrl =
        await getCachedNoteImage(
            note.image_url
        );


    /*
       Download if necessary.
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

    } else if (!navigator.onLine) {

        noteText.textContent =
            "Image unavailable offline.";

    }

    } else {

        noteText.textContent =
            note.text || "";

    }


    /*
       Draw date
    */

    noteDate.textContent =
        formatDrawDate(
            note.drawn_at
        );


    /*
       Sticky colour
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
   CLOSE MODAL
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

backButton.addEventListener(
    "click",
    () => {

        window.location.href =
            "jar2.html";

    }
);


/* =========================
   FORMAT DATE
========================= */

function formatDrawDate(
    dateString
) {

    if (!dateString) {

        return "";

    }


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

async function startCollection() {

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
            "jar2collection.html"
        );


        window.location.href =
            "pin.html";

        return;

    }


    /*
       PIN session is active.
       Refresh the activity timer.
    */

    updatePinActivity();


    await loadCollection();

}


startCollection();