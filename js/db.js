const DB_NAME = 'HolografixDB';
const STORE_NAME = 'models';
const HISTORY_STORE = 'history';

/**
 * Inicializa o banco de dados
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 2); // Versão 2 para suportar histórico
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            if (!db.objectStoreNames.contains(HISTORY_STORE)) {
                db.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Salva o arquivo Blob no IndexedDB (Modelo Atual)
 */
async function saveModelToDB(file) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.put(file, 'currentModel');
        transaction.oncomplete = () => resolve();
        transaction.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Recupera o modelo salvo no IndexedDB (Modelo Atual)
 */
async function getModelFromDB() {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get('currentModel');
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = () => resolve(null);
    });
}

/**
 * Adiciona ao histórico e mantém limite de 5
 */
async function addToHistory(file) {
    const db = await openDB();

    // 1. Pegar histórico atual
    const history = await getHistory();

    // 2. Se já existe um com o mesmo nome, remove o antigo para não duplicar
    const existingIndex = history.findIndex(item => item.name === file.name);
    if (existingIndex !== -1) {
        await deleteFromHistory(history[existingIndex].id);
    }

    // 3. Adicionar novo
    const transaction = db.transaction(HISTORY_STORE, 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE);
    store.add({
        name: file.name,
        blob: file,
        size: file.size,
        timestamp: Date.now()
    });

    // 4. Limpar se passar de 5
    const updatedHistory = await getHistory();
    if (updatedHistory.length > 5) {
        // Ordena por data e remove o mais antigo (index 0 após sort)
        updatedHistory.sort((a, b) => a.timestamp - b.timestamp);
        await deleteFromHistory(updatedHistory[0].id);
    }
}

async function getHistory() {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(HISTORY_STORE, 'readonly');
        const store = transaction.objectStore(HISTORY_STORE);
        const request = store.getAll();
        request.onsuccess = () => {
            // Retorna ordenado pelo mais recente
            const result = request.result || [];
            resolve(result.sort((a, b) => b.timestamp - a.timestamp));
        };
        request.onerror = () => resolve([]);
    });
}

async function deleteFromHistory(id) {
    const db = await openDB();
    return new Promise((resolve) => {
        const transaction = db.transaction(HISTORY_STORE, 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE);
        store.delete(id);
        transaction.oncomplete = () => resolve();
    });
}

/**
 * Limpa o banco de dados e reinicia a sessão
 */
async function resetAll() {
    sessionStorage.clear();
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME, HISTORY_STORE], 'readwrite');
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(HISTORY_STORE).clear();
    transaction.oncomplete = () => window.location.reload();
}
