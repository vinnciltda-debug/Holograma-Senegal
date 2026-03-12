const DB_NAME = 'HolografixDB';
const STORE_NAME = 'models';

/**
 * Salva o arquivo Blob no IndexedDB
 */
async function saveModelToDB(file) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
                e.target.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.put(file, 'currentModel');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject();
        };
    });
}

/**
 * Recupera o modelo salvo no IndexedDB
 */
async function getModelFromDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) return resolve(null);

            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const getRequest = store.get('currentModel');
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => resolve(null);
        };
        request.onerror = () => resolve(null);
    });
}

/**
 * Limpa o banco de dados e reinicia a sessão
 */
function resetAll() {
    sessionStorage.clear();
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = (e) => {
        const db = e.target.result;
        if (db.objectStoreNames.contains(STORE_NAME)) {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).clear();
            transaction.oncomplete = () => window.location.reload();
        } else {
            window.location.reload();
        }
    };
}
