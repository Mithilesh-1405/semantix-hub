import React, { useEffect, useState } from 'react';

interface SearchResult {
    id: number;
    page: number;
    similarity: number;
    similarityPercent: number;
    text: string;
    metadata: {
        source: string;
        pdfId: number;
    };
}

interface PDFHighlighterProps {
    activeResult: SearchResult | null;
    currentPage: number;
    scale: number;
}

interface HighlightRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

// Normalize text for fuzzy matching:
// - collapse all whitespace to single space
// - lowercase
// - normalize quotes/dashes
// - strip citation brackets like [12]
function normalize(text: string): string {
    return text
        .replace(/\[\s*\d+\s*\]/g, ' ')   // strip [12] style citations
        .replace(/[\u2018\u2019`]/g, "'")
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u2013\u2014]/g, '-')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

// Build a flat string from all text layer spans, tracking which span + offset each char maps back to
function buildTextMap(spans: HTMLSpanElement[]) {
    let full = '';
    // charMap[i] = { spanIndex, localOffset } for char i in `full`
    const charMap: { spanIndex: number; localOffset: number }[] = [];

    spans.forEach((span, spanIndex) => {
        const t = span.textContent ?? '';
        for (let i = 0; i < t.length; i++) {
            charMap.push({ spanIndex, localOffset: i });
            full += t[i];
        }
    });

    return { full, charMap };
}

// Given a start..end range in the original full string, get DOMRects relative to the text layer
function getRectsForOriginalRange(
    start: number,
    end: number,
    spans: HTMLSpanElement[],
    charMap: { spanIndex: number; localOffset: number }[],
    textLayerRect: DOMRect
): HighlightRect[] {
    const rects: HighlightRect[] = [];
    if (start >= end) return rects;

    // Group consecutive chars by span
    let i = start;
    while (i < end) {
        const { spanIndex, localOffset } = charMap[i];
        let j = i + 1;
        while (
            j < end &&
            charMap[j].spanIndex === spanIndex &&
            charMap[j].localOffset === localOffset + (j - i)
        ) {
            j++;
        }

        const span = spans[spanIndex];
        const textNode = span.firstChild;
        if (textNode?.nodeType === Node.TEXT_NODE) {
            try {
                const range = document.createRange();
                range.setStart(textNode, localOffset);
                range.setEnd(textNode, localOffset + (j - i));
                const r = range.getBoundingClientRect();
                if (r.width > 0 && r.height > 0) {
                    rects.push({
                        top: r.top - textLayerRect.top,
                        left: r.left - textLayerRect.left,
                        width: r.width,
                        height: r.height,
                    });
                }
            } catch (_) { /* span text shorter than expected */ }
        }
        i = j;
    }
    return rects;
}

// Merge rects on the same visual line into one wide rect
function mergeRects(rects: HighlightRect[]): HighlightRect[] {
    if (!rects.length) return [];
    const sorted = [...rects].sort((a, b) => a.top - b.top || a.left - b.left);
    const merged: HighlightRect[] = [];
    let cur = { ...sorted[0] };
    for (let i = 1; i < sorted.length; i++) {
        const r = sorted[i];
        if (Math.abs(r.top - cur.top) < 5) {
            const right = Math.max(cur.left + cur.width, r.left + r.width);
            cur.left = Math.min(cur.left, r.left);
            cur.width = right - cur.left;
            cur.height = Math.max(cur.height, r.height);
        } else {
            merged.push(cur);
            cur = { ...r };
        }
    }
    merged.push(cur);
    return merged;
}

// Try to find `query` inside `haystack` (both already normalized) and return the match index
function findNormalized(haystack: string, query: string): number {
    const nq = normalize(query);
    if (nq.length < 6) return -1;
    return haystack.indexOf(nq);
}

// Build a mapping: normalizedIndex → originalIndex
// so we can go from a match in the normalized string back to the original string
function buildNormMap(original: string): { normStr: string; normToOrig: number[] } {
    let normStr = '';
    const normToOrig: number[] = [];
    let lastWasSpace = false;

    for (let i = 0; i < original.length; i++) {
        const raw = original[i];
        // apply same transforms as normalize()
        if (/\[\s*\d+\s*\]/.test(original.slice(i))) {
            // skip citation bracket entirely
            const m = original.slice(i).match(/^\[\s*\d+\s*\]/);
            if (m) {
                i += m[0].length - 1;
                if (!lastWasSpace) {
                    normStr += ' ';
                    normToOrig.push(i);
                    lastWasSpace = true;
                }
                continue;
            }
        }
        if (/\s/.test(raw)) {
            if (!lastWasSpace) {
                normStr += ' ';
                normToOrig.push(i);
                lastWasSpace = true;
            }
        } else {
            let c = raw.toLowerCase();
            if (c === '\u2018' || c === '\u2019' || c === '`') c = "'";
            else if (c === '\u201c' || c === '\u201d') c = '"';
            else if (c === '\u2013' || c === '\u2014') c = '-';
            normStr += c;
            normToOrig.push(i);
            lastWasSpace = false;
        }
    }
    return { normStr, normToOrig };
}

export default function PDFHighlighter({ activeResult, currentPage, scale }: PDFHighlighterProps) {
    const [highlightRects, setHighlightRects] = useState<HighlightRect[]>([]);
    const [containerStyle, setContainerStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        let active = true;

        const run = () => {
            if (!active) return;

            if (!activeResult || activeResult.page !== currentPage) {
                setHighlightRects([]);
                return;
            }

            const textLayer = document.querySelector('[class*="textLayer"]') as HTMLElement | null;
            if (!textLayer) { setHighlightRects([]); return; }

            setContainerStyle({
                position: 'absolute',
                top: textLayer.offsetTop,
                left: textLayer.offsetLeft,
                width: textLayer.offsetWidth,
                height: textLayer.offsetHeight,
                pointerEvents: 'none',
                zIndex: 10,
            });

            const spans = Array.from(textLayer.querySelectorAll('span')) as HTMLSpanElement[];
            if (!spans.length) { setHighlightRects([]); return; }

            const { full, charMap } = buildTextMap(spans);
            const { normStr, normToOrig } = buildNormMap(full);
            const textLayerRect = textLayer.getBoundingClientRect();

            const getRects = (query: string): HighlightRect[] => {
                const nq = normalize(query);
                if (nq.length < 6) return [];
                const matchAt = normStr.indexOf(nq);
                if (matchAt === -1) return [];
                const origStart = normToOrig[matchAt];
                const origEnd = normToOrig[Math.min(matchAt + nq.length - 1, normToOrig.length - 1)] + 1;
                return getRectsForOriginalRange(origStart, origEnd, spans, charMap, textLayerRect);
            };

            // --- Strategy 1: full text ---
            let rects = getRects(activeResult.text);

            // --- Strategy 2: sentence splits ---
            if (!rects.length) {
                const sentences = activeResult.text
                    .split(/(?<=\.)\s+(?=[A-Z\[])/)
                    .flatMap(s => s.split(/;\s+/))
                    .map(s => s.trim())
                    .filter(s => s.length >= 20);
                const combined: HighlightRect[] = [];
                for (const s of sentences) combined.push(...getRects(s));
                if (combined.length) rects = combined;
            }

            // --- Strategy 3: sliding word windows (largest first) ---
            if (!rects.length) {
                const words = activeResult.text.trim().split(/\s+/).filter(Boolean);
                outer:
                for (const windowSize of [15, 12, 10, 8]) {
                    if (words.length < windowSize) continue;
                    const combined: HighlightRect[] = [];
                    const seen = new Set<string>();
                    for (let i = 0; i <= words.length - windowSize; i++) {
                        const phrase = words.slice(i, i + windowSize).join(' ');
                        const nq = normalize(phrase);
                        if (seen.has(nq)) continue;
                        seen.add(nq);
                        combined.push(...getRects(phrase));
                    }
                    if (combined.length) { rects = combined; break outer; }
                }
            }

            // --- Strategy 4: first 80 chars ---
            if (!rects.length) {
                rects = getRects(activeResult.text.slice(0, 80));
            }

            if (rects.length) {
                const merged = mergeRects(rects);
                setHighlightRects(merged);

                // Scroll to first highlight
                const scrollContainer = (
                    textLayer.closest('.overflow-auto') ??
                    textLayer.parentElement
                ) as HTMLElement | null;
                if (scrollContainer) {
                    const pageTop =
                        textLayer.getBoundingClientRect().top -
                        scrollContainer.getBoundingClientRect().top +
                        scrollContainer.scrollTop;
                    const target = pageTop + merged[0].top - scrollContainer.offsetHeight / 2;
                    scrollContainer.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
                }
            } else {
                setHighlightRects([]);
            }
        };

        // Wait for react-pdf text layer to finish rendering
        const id = setTimeout(run, 350);
        return () => { active = false; clearTimeout(id); };

    }, [activeResult, currentPage, scale]);

    return (
        <div style={containerStyle}>
            {highlightRects.map((rect, i) => (
                <div
                    key={i}
                    style={{
                        position: 'absolute',
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height,
                        backgroundColor: 'rgba(255, 213, 0, 0.55)',
                        borderBottom: '2px solid rgba(200, 160, 0, 0.9)',
                        borderRadius: '1.5px',
                        boxShadow: '0 1px 4px rgba(200, 160, 0, 0.2)',
                        mixBlendMode: 'multiply',
                        pointerEvents: 'none',
                        animation: 'highlight-pulse 1.5s ease-out infinite alternate',
                    }}
                />
            ))}
            <style>{`
                @keyframes highlight-pulse {
                    0%   { background-color: rgba(255, 213, 0, 0.40); }
                    100% { background-color: rgba(255, 213, 0, 0.65); }
                }
            `}</style>
        </div>
    );
}