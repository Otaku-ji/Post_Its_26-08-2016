const CACHE_NAME = "postit-game-v5";


const APP_FILES = [
    "./",
    "./index.html",
    "./collection.html",
    "./style.css",
    "./app.js",
    "./collection.js",
    "./pin.html",
    "./pin.js",
    "./setup-pin.html",
    "./setup-pin.js",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
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

        if (
            event.request.method !==
            "GET"
        ) {

            return;

        }


        const url =
            new URL(
                event.request.url
            );


        /*
           Never cache Supabase requests.
        */

        if (
            url.hostname.endsWith(
                "supabase.co"
            )
        ) {

            return;

        }


        /*
           NETWORK FIRST

           Try the newest version from
           GitHub Pages first.

           If there is no internet,
           use the cached version.
        */

        event.respondWith(

            fetch(
                event.request
            )
                .then(
                    response => {

                        /*
                           Only cache successful
                           normal responses.
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
                )
                .catch(
                    () => {

                        /*
                           No internet.

                           Use the cached version.
                        */

                        return caches.match(
                            event.request
                        );

                    }
                )

        );

    }
);
