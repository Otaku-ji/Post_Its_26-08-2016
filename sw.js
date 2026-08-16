const CACHE_NAME = "postit-game-v1";


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

           app.js and collection.js
           communicate directly with
           Supabase.
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
           Cache-first strategy.

           If the file is already cached,
           use the cached version.

           Otherwise fetch it from the
           internet and add it to the cache.
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

                                    /*
                                       Only cache successful
                                       responses.
                                    */

                                    if (
                                        response &&
                                        response.status === 200 &&
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