/**
 * Utilidades de búsqueda tolerante a errores.
 *
 * Objetivo: que el buscador siga encontrando el producto aunque el usuario
 * escriba mal una letra, se coma un carácter, invierta dos letras
 * ("prodcuto" → "producto"), omita acentos ("labial rosa" ↔ "Labiál Rosá")
 * o escriba las palabras en otro orden ("rojo labial" → "Labial Rojo").
 */

/**
 * Minúsculas, sin acentos ni diacríticos, sin signos y con espacios colapsados.
 * "Máscara N°2 (L'Oréal)" → "mascara n 2 l oreal"
 */
export function normalizeText(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // acentos, dieresis y tilde de la enye
        .replace(/[^a-z0-9\s]+/g, ' ')    // signos de puntuación
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Distancia de edición Damerau-Levenshtein (OSA): cuenta inserciones,
 * borrados, sustituciones y transposiciones de letras contiguas.
 * Se corta apenas supera `maxDist` para no gastar tiempo de más.
 */
function editDistance(a, b, maxDist = Infinity) {
    const al = a.length;
    const bl = b.length;
    if (Math.abs(al - bl) > maxDist) return maxDist + 1;
    if (al === 0) return bl;
    if (bl === 0) return al;

    let twoAgo = null;
    let prev = new Array(bl + 1);
    let curr = new Array(bl + 1);
    for (let j = 0; j <= bl; j++) prev[j] = j;

    for (let i = 1; i <= al; i++) {
        curr[0] = i;
        let rowMin = i;
        for (let j = 1; j <= bl; j++) {
            const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
            let val = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
            if (
                i > 1 && j > 1 &&
                a.charCodeAt(i - 1) === b.charCodeAt(j - 2) &&
                a.charCodeAt(i - 2) === b.charCodeAt(j - 1)
            ) {
                val = Math.min(val, twoAgo[j - 2] + 1); // transposición
            }
            curr[j] = val;
            if (val < rowMin) rowMin = val;
        }
        if (rowMin > maxDist) return maxDist + 1;
        const recycled = twoAgo;
        twoAgo = prev;
        prev = curr;
        curr = recycled || new Array(bl + 1);
    }
    return prev[bl];
}

/** Cuántos errores se toleran según lo largo que sea lo escrito. */
function toleranceFor(len) {
    if (len <= 2) return 0;
    if (len <= 5) return 1;
    if (len <= 8) return 2;
    return 3;
}

/** ¿Están todas las letras de `needle` dentro de `haystack`, en orden? */
function isSubsequence(needle, haystack) {
    let i = 0;
    for (let j = 0; j < haystack.length && i < needle.length; j++) {
        if (needle.charCodeAt(i) === haystack.charCodeAt(j)) i++;
    }
    return i === needle.length;
}

/**
 * Prepara el texto contra el que se busca. Se calcula una sola vez por
 * producto/combo y se reutiliza en cada tecla.
 */
export function buildHaystack(...parts) {
    const text = normalizeText(parts.filter(Boolean).join(' '));
    return {
        text,
        words: text ? text.split(' ') : [],
        condensed: text.replace(/ /g, ''),
    };
}

/** Puntúa una sola palabra escrita contra todo el texto del producto. */
function scoreToken(token, hay) {
    const tol = toleranceFor(token.length);
    let best = 0;

    for (const word of hay.words) {
        if (word === token) return 100;
        if (word.startsWith(token)) {
            best = Math.max(best, 92 - Math.min(8, word.length - token.length));
            continue;
        }
        if (word.includes(token)) {
            best = Math.max(best, 78);
            continue;
        }
        if (tol > 0) {
            const d = editDistance(token, word, tol);
            if (d <= tol) {
                best = Math.max(best, 72 - d * 12);
                continue;
            }
            // Escribió el principio de la palabra, y con un error dentro:
            // "lbaia" → "labial rosa"
            if (word.length > token.length) {
                const dp = editDistance(token, word.slice(0, token.length), tol);
                if (dp <= tol) best = Math.max(best, 66 - dp * 12);
            }
        }
    }

    if (best > 0) return best;

    // Escrito todo junto o partido: "labialrosa", "mascarapesta"
    if (token.length >= 3) {
        if (hay.condensed.includes(token)) return 58;
        if (tol > 0 && hay.condensed.length >= token.length) {
            const limit = hay.condensed.length - token.length + tol;
            for (let start = 0; start <= limit; start++) {
                const window = hay.condensed.slice(start, start + token.length + tol);
                if (editDistance(token, window, tol) <= tol) return 50;
            }
        }
        if (token.length >= 4 && isSubsequence(token, hay.condensed)) return 30;
    }

    return 0;
}

/**
 * Devuelve una puntuación (mayor = mejor coincidencia) o `null` si no coincide.
 * Todas las palabras escritas deben coincidir con algo, pero en cualquier orden.
 */
export function fuzzyScore(query, hay) {
    const q = normalizeText(query);
    if (!q) return 0;
    if (!hay || !hay.text) return null;

    const tokens = q.split(' ').filter(Boolean);
    if (tokens.length === 0) return 0;

    let total = 0;
    for (const token of tokens) {
        const s = scoreToken(token, hay);
        if (s <= 0) return null;
        total += s;
    }

    let score = total / tokens.length;

    // Bonus si la frase completa aparece tal cual
    if (hay.text === q) score += 60;
    else if (hay.text.startsWith(q)) score += 35;
    else if (hay.text.includes(q)) score += 20;

    return score;
}

/**
 * Filtra y ordena una lista por relevancia. Empates conservan el orden original.
 */
export function fuzzySearchList(query, list, getHaystack) {
    if (!normalizeText(query)) return list;
    return fuzzyCandidates(query, list, getHaystack, 0).map(s => s.item);
}

/**
 * Igual que `fuzzySearchList` pero devuelve también la puntuación de cada
 * coincidencia, para poder mostrar qué tan segura es y ofrecer alternativas.
 * `limit` 0 = sin límite.
 */
export function fuzzyCandidates(query, list, getHaystack, limit = 8) {
    if (!normalizeText(query)) return [];
    const scored = [];
    for (let i = 0; i < list.length; i++) {
        const score = fuzzyScore(query, getHaystack(list[i], i));
        if (score !== null) scored.push({ item: list[i], score, i });
    }
    scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
    return limit > 0 ? scored.slice(0, limit) : scored;
}

/**
 * Qué tan confiable es una puntuación, para pintarla en pantalla.
 */
export function matchConfidence(score) {
    if (score === null || score === undefined) return 'ninguna';
    if (score >= 110) return 'exacta';
    if (score >= 70) return 'alta';
    if (score >= 45) return 'media';
    return 'baja';
}
