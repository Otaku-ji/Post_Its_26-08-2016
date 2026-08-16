const CACHE_NAME = "postit-game-v2";


const APP_FILES = [
    "./",
    "./index.html",
    "./collection.html",
    "./style.css",
    "./app.js",
    "./collection.js"
];


/* =========================
   INSTALL
========================= */

self.addEventListener(
    "install",
    event => {

        console.log(
            "Service Worker: installing..."
        );


        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(
                    cache =>
                        cache.addAll(
                            APP_FILES
                        )
                )

        );


        self.skipWaiting();

    }
);


/* =========================
   ACTIVATE
========================= */

self.addEventListener(
    "activate",
    event => {

        console.log(
            "Service Worker: activated."
        );


        event.waitUntil(

            caches
                .keys()
                .then(
                    cacheNames => {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    cacheName =>
                                        cacheName !==
                                        CACHE_NAME
                                )
                                .map(
                                    cacheName =>
                                        caches.delete(
                                            cacheName
                                        )
                                )

                        );

                    }
                )

        );


        self.clients.claim();

    }
);


/* =========================
   FETCH
========================= */

/* =========================
   FETCH
========================= */

self.addEventListener(
    "fetch",
    event => {

        /*
           Only handle normal GET requests.
        */

        if (
            event.request.method !==
            "GET"
        ) {

            return;

        }


        /*
           Do not cache Supabase/API requests.
        */

        const url =
            new URL(
                event.request.url
            );


        if (
            url.hostname.endsWith(
                "supabase.co"
            )
        ) {

            return;

        }


        /*
           HTML pages:
           NETWORK FIRST.

           This means the browser checks
           GitHub Pages for the newest HTML
           whenever internet is available.

           If offline, it uses the cached
           version instead.
        */

        if (
            event.request.destination ===
                "document"
        ) {

            event.respondWith(

                fetch(
                    event.request
                )
                    .then(
                        response => {

                            if (
                                response &&
                                response.status ===
                                    200
                            ) {

                                const responseClone =
                                    response.clone();


                                caches
                                    .open(
                                        CACHE_NAME
                                    )
                                    .then(
                                        cache => {

                                            cache.put(
                                                event.request,
                                                responseClone
                                            );

                                        }
                                    );

                            }


                            return response;

                        }
                    )
                    .catch(
                        () =>
                            caches.match(
                                event.request
                            )
                    )

            );

            return;

        }


        /*
           Other files:
           CACHE FIRST.

           CSS and JavaScript can still
           work offline.
        */

        event.respondWith(

            caches
                .match(
                    event.request
                )
                .then(
                    cachedResponse => {

                        if (
                            cachedResponse
                        ) {

                            return cachedResponse;

                        }


                        return fetch(
                            event.request
                        )
                            .then(
                                response => {

                                    if (
                                        response &&
                                        response.status ===
                                            200 &&
                                        response.type ===
                                            "basic"
                                    ) {

                                        const responseClone =
                                            response.clone();


                                        caches
                                            .open(
                                                CACHE_NAME
                                            )
                                            .then(
                                                cache => {

                                                    cache.put(
                                                        event.request,
                                                        responseClone
                                                    );

                                                }
                                            );

                                    }


                                    return response;

                                }
                            );

                    }
                )

        );

    }
);